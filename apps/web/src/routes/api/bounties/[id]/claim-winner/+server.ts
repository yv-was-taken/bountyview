import { and, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { bounties, db, payouts, submissions, users } from '@bountyview/db';
import { claimWinnerInputSchema } from '@bountyview/shared';
import { requireRole } from '$lib/server/auth-guard';
import { badRequest, conflict, notFound, serverError } from '$lib/server/http';
import { writeAuditLog } from '$lib/server/audit';
import { readJson } from '$lib/server/request';
import { verifyClaimTransaction } from '$lib/server/services/escrow';

function getClaimVerificationErrorMessage(err: unknown): string | null {
  if (!(err instanceof Error)) {
    return null;
  }

  if (err.name === 'TransactionReceiptNotFoundError') {
    return 'Transaction receipt not found';
  }

  if (err.message.includes('Claim transaction failed on-chain')) {
    return 'Claim transaction failed on-chain';
  }

  if (err.message.includes('No matching BountyClaimed event found in transaction receipt')) {
    return 'Transaction does not match this bounty claim';
  }

  if (err.message.includes('Transaction receipt not found')) {
    return 'Transaction receipt not found';
  }

  return null;
}

export async function POST(event) {
  const employer = await requireRole(event, 'employer');

  const body = await readJson<unknown>(event.request);
  if (!body.ok) {
    return body.response;
  }

  const parsed = claimWinnerInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return badRequest('Invalid winner payload', parsed.error.flatten());
  }

  const bounty = await db.query.bounties.findFirst({
    where: and(eq(bounties.id, event.params.id), eq(bounties.employerId, employer.id))
  });

  if (!bounty) {
    return notFound('Bounty not found');
  }

  if (bounty.status !== 'open') {
    return conflict('Bounty is not open');
  }

  const gracePeriodEnd = new Date(bounty.submissionDeadline);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + bounty.gracePeriodDays);
  if (new Date() > gracePeriodEnd) {
    return conflict('Review grace period has expired');
  }

  if (!bounty.onchainBountyId) {
    return conflict('Bounty is not funded on-chain');
  }

  const winningSubmission = await db.query.submissions.findFirst({
    where: and(eq(submissions.id, parsed.data.submissionId), eq(submissions.bountyId, bounty.id))
  });

  if (!winningSubmission) {
    return notFound('Submission not found');
  }

  const winner = await db.query.users.findFirst({
    where: eq(users.id, winningSubmission.candidateId)
  });
  if (!winner?.privyWalletAddress) {
    return conflict('Winner must have a registered wallet address');
  }

  if (winner.privyWalletAddress.toLowerCase() !== parsed.data.winnerAddress.toLowerCase()) {
    return conflict('Winner address must match candidate wallet address');
  }

  let verification:
    | {
        txHash: `0x${string}`;
        blockNumber: string;
      }
    | null = null;
  try {
    verification = await verifyClaimTransaction({
      txHash: parsed.data.txHash as `0x${string}`,
      expectedOnchainBountyId: bounty.onchainBountyId,
      expectedWinnerAddress: parsed.data.winnerAddress,
      expectedAmountUsdc: String(bounty.bountyAmountUsdc)
    });
  } catch (err) {
    const verificationMessage = getClaimVerificationErrorMessage(err);
    if (verificationMessage) {
      return badRequest(verificationMessage);
    }

    console.error('Claim transaction verification failed', err);
    return serverError('Failed to verify claim transaction');
  }

  if (!verification) {
    return serverError('Failed to verify claim transaction');
  }

  try {
    const verifiedClaim = verification;
    await db.transaction(async (tx) => {
      await tx
        .update(submissions)
        .set({
          isWinner: false,
          reviewStatus: 'rejected',
          rejectionReason: 'Not selected as winner',
          reviewedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(submissions.bountyId, bounty.id));

      await tx
        .update(submissions)
        .set({
          isWinner: true,
          reviewStatus: 'winner',
          rejectionReason: null,
          reviewedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(submissions.id, winningSubmission.id));

      await tx
        .update(bounties)
        .set({
          status: 'claimed',
          updatedAt: new Date()
        })
        .where(eq(bounties.id, bounty.id));

      await tx.insert(payouts).values({
        submissionId: winningSubmission.id,
        candidateId: winningSubmission.candidateId,
        provider: 'self_service',
        status: 'completed',
        amountUsdc: String(bounty.bountyAmountUsdc),
        metadata: {
          winnerAddress: parsed.data.winnerAddress,
          onchain: {
            bountyId: bounty.onchainBountyId,
            txHash: verifiedClaim.txHash,
            blockNumber: verifiedClaim.blockNumber
          }
        }
      });
    });

    await writeAuditLog('bounty.claimed', {
      bountyId: bounty.id,
      submissionId: winningSubmission.id,
      winnerAddress: parsed.data.winnerAddress,
      employerId: employer.id,
      txHash: parsed.data.txHash
    });

    return json({ ok: true, submissionId: winningSubmission.id });
  } catch (err) {
    console.error('Claim winner failed', err);
    return serverError('Failed to claim winner');
  }
}
