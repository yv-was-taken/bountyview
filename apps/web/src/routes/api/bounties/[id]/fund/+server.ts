import { and, eq, isNull, sql } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { bounties, bountyFunding, db } from '@bountyview/db';
import { requireRole } from '$lib/server/auth-guard';
import { badRequest, conflict, notFound, serverError } from '$lib/server/http';
import { readJson } from '$lib/server/request';
import { enqueue } from '$lib/server/queue';
import { writeAuditLog } from '$lib/server/audit';
import { verifyFundingTransaction } from '$lib/server/services/escrow';

const inputSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/)
});

class FundingConflictError extends Error {}

function formatUsdc(amount: bigint): string {
  const whole = amount / 1_000_000n;
  const fraction = (amount % 1_000_000n).toString().padStart(6, '0');
  return `${whole}.${fraction}`;
}

function parseUsdcToUnits(amount: string): bigint {
  if (!amount || !/^\d*\.?\d*$/.test(amount)) {
    throw new Error('Invalid USDC amount');
  }
  const [wholePart = '0', fractionPart = ''] = amount.split('.');
  const normalizedFraction = fractionPart.padEnd(6, '0').slice(0, 6);
  return BigInt(wholePart || '0') * 1_000_000n + BigInt(normalizedFraction);
}

function normalizeTxHash(txHash: string): `0x${string}` {
  return txHash.toLowerCase() as `0x${string}`;
}

export async function POST(event) {
  const employer = await requireRole(event, 'employer');

  const body = await readJson<unknown>(event.request);
  if (!body.ok) {
    return body.response;
  }

  const parsed = inputSchema.safeParse(body.data);
  if (!parsed.success) {
    return badRequest('Invalid funding payload', parsed.error.flatten());
  }

  const requestedTxHash = normalizeTxHash(parsed.data.txHash);

  const bounty = await db.query.bounties.findFirst({
    where: and(eq(bounties.id, event.params.id), eq(bounties.employerId, employer.id))
  });

  if (!bounty) {
    return notFound('Bounty not found');
  }

  if (bounty.onchainBountyId) {
    return conflict('Bounty funding is already linked');
  }

  try {
    const existingFundingByHash = await db
      .select({
        bountyId: bountyFunding.bountyId
      })
      .from(bountyFunding)
      .where(sql`lower(${bountyFunding.txHash}) = ${requestedTxHash}`)
      .limit(1);
    if (existingFundingByHash[0] && existingFundingByHash[0].bountyId !== bounty.id) {
      return conflict('Funding transaction is already linked to another bounty');
    }

    const verification = await verifyFundingTransaction({
      txHash: requestedTxHash,
      expectedAmountUsdc: String(bounty.bountyAmountUsdc),
      expectedDeadline: bounty.submissionDeadline
    });
    const verifiedTxHash = normalizeTxHash(verification.txHash);
    if (verifiedTxHash !== requestedTxHash) {
      return conflict('Funding transaction hash mismatch');
    }

    const bountyAmountUnits = parseUsdcToUnits(String(bounty.bountyAmountUsdc));
    const feeUnits = (bountyAmountUnits * 300n) / 10_000n;
    const escrowUnits = bountyAmountUnits + feeUnits;

    await db.transaction(async (tx) => {
      const insertedFunding = await tx
        .insert(bountyFunding)
        .values({
          bountyId: bounty.id,
          txHash: verifiedTxHash,
          chainId: 8453,
          escrowAmount: formatUsdc(escrowUnits)
        })
        .onConflictDoNothing()
        .returning({
          bountyId: bountyFunding.bountyId
        });

      if (insertedFunding.length === 0) {
        const [linkedByHash] = await tx
          .select({
            bountyId: bountyFunding.bountyId
          })
          .from(bountyFunding)
          .where(sql`lower(${bountyFunding.txHash}) = ${verifiedTxHash}`)
          .limit(1);

        if (linkedByHash && linkedByHash.bountyId !== bounty.id) {
          throw new FundingConflictError('Funding transaction is already linked to another bounty');
        }

        const [linkedByBounty] = await tx
          .select({
            txHash: bountyFunding.txHash
          })
          .from(bountyFunding)
          .where(eq(bountyFunding.bountyId, bounty.id))
          .limit(1);

        if (linkedByBounty && normalizeTxHash(linkedByBounty.txHash) !== verifiedTxHash) {
          throw new FundingConflictError('Bounty funding is already linked');
        }

        if (!linkedByHash && !linkedByBounty) {
          throw new Error('Funding transaction could not be persisted');
        }
      }

      const updatedBounty = await tx
        .update(bounties)
        .set({
          onchainBountyId: verification.onchainBountyId,
          updatedAt: new Date()
        })
        .where(and(eq(bounties.id, bounty.id), eq(bounties.employerId, employer.id), isNull(bounties.onchainBountyId)))
        .returning({
          id: bounties.id
        });

      if (updatedBounty.length === 0) {
        const [existingBounty] = await tx
          .select({
            onchainBountyId: bounties.onchainBountyId
          })
          .from(bounties)
          .where(eq(bounties.id, bounty.id))
          .limit(1);

        if (existingBounty?.onchainBountyId !== verification.onchainBountyId) {
          throw new FundingConflictError('Bounty funding is already linked');
        }
      }
    });

    await enqueue('sync_escrow_events', {
      trigger: 'manual_funding',
      bountyId: bounty.id,
      txHash: verifiedTxHash
    });

    await writeAuditLog('bounty.funded', {
      bountyId: bounty.id,
      employerId: employer.id,
      txHash: verifiedTxHash,
      onchainBountyId: verification.onchainBountyId
    });

    return json({ ok: true });
  } catch (err) {
    if (err instanceof FundingConflictError) {
      return conflict(err.message);
    }
    console.error('Funding link failed', err);
    return serverError('Failed to register funding transaction');
  }
}
