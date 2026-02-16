import { and, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { bounties, db, payouts, submissions } from '@bountyview/db';
import { claimWinnerInputSchema } from '@bountyview/shared';
import { requireRole } from '$lib/server/auth-guard';
import { badRequest, conflict, notFound, serverError } from '$lib/server/http';
import { writeAuditLog } from '$lib/server/audit';
import { readJson } from '$lib/server/request';

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

  const winningSubmission = await db.query.submissions.findFirst({
    where: and(eq(submissions.id, parsed.data.submissionId), eq(submissions.bountyId, bounty.id))
  });

  if (!winningSubmission) {
    return notFound('Submission not found');
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(submissions)
        .set({
          isWinner: false,
          updatedAt: new Date()
        })
        .where(eq(submissions.bountyId, bounty.id));

      await tx
        .update(submissions)
        .set({
          isWinner: true,
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
            bountyId: bounty.onchainBountyId
          }
        }
      });
    });

    await writeAuditLog('bounty.claimed', {
      bountyId: bounty.id,
      submissionId: winningSubmission.id,
      winnerAddress: parsed.data.winnerAddress,
      employerId: employer.id
    });

    return json({ ok: true, submissionId: winningSubmission.id });
  } catch (err) {
    console.error('Claim winner failed', err);
    return serverError('Failed to claim winner');
  }
}
