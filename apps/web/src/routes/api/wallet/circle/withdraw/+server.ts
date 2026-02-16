import { randomUUID } from 'node:crypto';
import { json } from '@sveltejs/kit';
import { circleWithdrawInputSchema } from '@bountyview/shared';
import { db, payouts } from '@bountyview/db';
import { requireRole } from '$lib/server/auth-guard';
import { badRequest, conflict, serverError } from '$lib/server/http';
import { readJson } from '$lib/server/request';
import { createCircleWithdrawal } from '$lib/server/services/circle';
import { enqueue } from '$lib/server/queue';
import { writeAuditLog } from '$lib/server/audit';
import { eq, sql } from 'drizzle-orm';

function normalizeStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
  const mapped = status.toLowerCase();
  if (mapped === 'complete' || mapped === 'completed') return 'completed';
  if (mapped === 'failed') return 'failed';
  if (mapped === 'cancelled') return 'cancelled';
  if (mapped === 'processing') return 'processing';
  return 'pending';
}

function parseUsdcToUnits(amount: string): bigint {
  const [wholePart = '0', fractionPart = ''] = amount.split('.');
  const normalizedWhole = wholePart === '' ? '0' : wholePart;
  const normalizedFraction = fractionPart.padEnd(6, '0').slice(0, 6);
  return BigInt(normalizedWhole) * 1_000_000n + BigInt(normalizedFraction);
}

function floorToCirclePrecision(units: bigint): bigint {
  // Circle transfer amount is USD with 2 decimal places.
  return (units / 10_000n) * 10_000n;
}

function formatUnitsAsUsdc(units: bigint): string {
  const whole = units / 1_000_000n;
  const fraction = (units % 1_000_000n).toString().padStart(6, '0');
  return `${whole}.${fraction}`;
}

function formatUnitsAsUsd2(units: bigint): string {
  const cents = units / 10_000n;
  const whole = cents / 100n;
  const fraction = (cents % 100n).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
}

function amountToUnits(amount: number): bigint {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('INVALID_AMOUNT');
  }

  // Canonicalize to USDC precision.
  return parseUsdcToUnits(amount.toFixed(6));
}

export async function POST(event) {
  const candidate = await requireRole(event, 'candidate');

  const body = await readJson<unknown>(event.request);
  if (!body.ok) {
    return body.response;
  }

  const parsed = circleWithdrawInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return badRequest('Invalid withdrawal payload', parsed.error.flatten());
  }

  try {
    const requestedAmountUnits = amountToUnits(parsed.data.amountUsdc);
    const roundedAmountUnits = floorToCirclePrecision(requestedAmountUnits);
    if (roundedAmountUnits <= 0n) {
      throw new Error('INVALID_AMOUNT');
    }

    const transferAmountUsd2 = formatUnitsAsUsd2(roundedAmountUnits);
    const ledgerAmountUsdc = formatUnitsAsUsdc(roundedAmountUnits);

    const idempotencyKey = randomUUID();

    const payout = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${candidate.id}))`);

      const totalsResult = await tx.execute(sql`
        SELECT
          COALESCE(SUM(CASE WHEN provider = 'self_service' AND status = 'completed' THEN amount_usdc ELSE 0 END), 0)::numeric AS earned,
          COALESCE(SUM(CASE WHEN provider = 'circle' AND status IN ('pending', 'processing', 'completed') THEN amount_usdc ELSE 0 END), 0)::numeric AS withdrawn
        FROM payouts
        WHERE candidate_id = ${candidate.id}
      `);

      const totals = (totalsResult as unknown as { rows?: Array<{ earned: string; withdrawn: string }> }).rows?.[0] ?? {
        earned: '0',
        withdrawn: '0'
      };

      const earnedUnits = parseUsdcToUnits(totals.earned);
      const withdrawnUnits = parseUsdcToUnits(totals.withdrawn);
      const availableUnits = earnedUnits - withdrawnUnits;
      if (roundedAmountUnits > availableUnits) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      const inserted = await tx
        .insert(payouts)
        .values({
          candidateId: candidate.id,
          provider: 'circle',
          status: 'pending',
          amountUsdc: ledgerAmountUsdc,
          externalRef: null,
          metadata: {
            idempotencyKey,
            requestedAmountUsdc: formatUnitsAsUsdc(requestedAmountUnits),
            transferAmountUsd2,
            bankAccountId: parsed.data.bankAccountId,
            destinationCurrency: parsed.data.destinationCurrency
          }
        })
        .returning({
          id: payouts.id,
          status: payouts.status,
          externalRef: payouts.externalRef
        });

      return inserted[0];
    });

    if (!payout) {
      return serverError('Failed to create payout record');
    }

    try {
      const transfer = await createCircleWithdrawal({
        idempotencyKey,
        amountUsd2: transferAmountUsd2,
        bankAccountId: parsed.data.bankAccountId,
        destinationCurrency: parsed.data.destinationCurrency
      });

      await db
        .update(payouts)
        .set({
          externalRef: transfer.id,
          status: normalizeStatus(transfer.status),
          updatedAt: new Date()
        })
        .where(eq(payouts.id, payout.id));

      payout.externalRef = transfer.id;
      payout.status = normalizeStatus(transfer.status);
    } catch (circleErr) {
      console.error('Circle withdrawal call failed', circleErr);
      await db
        .update(payouts)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(payouts.id, payout.id));
      payout.status = 'failed';
    }

    if (payout.externalRef) {
      await enqueue('circle_withdraw_status_poll', {
        payoutId: payout.id,
        externalRef: payout.externalRef
      });
    }

    await writeAuditLog('circle.withdraw.requested', {
      payoutId: payout?.id,
      candidateId: candidate.id,
      requestedAmountUsdc: formatUnitsAsUsdc(requestedAmountUnits),
      transferAmountUsd2
    });

    return json({ payout }, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'INSUFFICIENT_BALANCE') {
        return conflict('Requested amount exceeds available winnings');
      }

      if (err.message === 'INVALID_AMOUNT') {
        return badRequest('Invalid withdrawal amount');
      }
    }

    console.error('Circle withdraw failed', err);
    return serverError('Failed to request Circle withdrawal');
  }
}
