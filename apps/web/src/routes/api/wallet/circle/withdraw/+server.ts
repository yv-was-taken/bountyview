import { randomUUID } from 'node:crypto';
import { json } from '@sveltejs/kit';
import { circleWithdrawInputSchema } from '@bountyview/shared';
import { db, payouts } from '@bountyview/db';
import { requireRole } from '$lib/server/auth-guard';
import { badRequest, serverError } from '$lib/server/http';
import { readJson } from '$lib/server/request';
import { createCircleWithdrawal } from '$lib/server/services/circle';
import { enqueue } from '$lib/server/queue';
import { writeAuditLog } from '$lib/server/audit';

function normalizeStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
  const mapped = status.toLowerCase();
  if (mapped === 'complete' || mapped === 'completed') return 'completed';
  if (mapped === 'failed') return 'failed';
  if (mapped === 'cancelled') return 'cancelled';
  if (mapped === 'processing') return 'processing';
  return 'pending';
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
    const transfer = await createCircleWithdrawal({
      idempotencyKey: randomUUID(),
      amountUsdc: parsed.data.amountUsdc,
      bankAccountId: parsed.data.bankAccountId,
      destinationCurrency: parsed.data.destinationCurrency
    });

    const inserted = await db
      .insert(payouts)
      .values({
        candidateId: candidate.id,
        provider: 'circle',
        status: normalizeStatus(transfer.status),
        amountUsdc: parsed.data.amountUsdc.toFixed(6),
        externalRef: transfer.id,
        metadata: {
          bankAccountId: parsed.data.bankAccountId,
          destinationCurrency: parsed.data.destinationCurrency
        }
      })
      .returning({
        id: payouts.id,
        status: payouts.status,
        externalRef: payouts.externalRef
      });

    const payout = inserted[0];

    if (payout?.externalRef) {
      await enqueue('circle_withdraw_status_poll', {
        payoutId: payout.id,
        externalRef: payout.externalRef
      });
    }

    await writeAuditLog('circle.withdraw.requested', {
      payoutId: payout?.id,
      candidateId: candidate.id,
      amountUsdc: parsed.data.amountUsdc
    });

    return json({ payout }, { status: 201 });
  } catch (err) {
    console.error('Circle withdraw failed', err);
    return serverError('Failed to request Circle withdrawal');
  }
}
