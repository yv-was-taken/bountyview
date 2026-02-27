import { and, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { bounties, db, githubAccessGrants, submissions, users } from '@bountyview/db';
import { requireRole } from '$lib/server/auth-guard';
import { badRequest, conflict, notFound, serverError } from '$lib/server/http';
import { enqueue } from '$lib/server/queue';
import { QUEUE_NAMES } from '@bountyview/shared';
import { writeAuditLog } from '$lib/server/audit';
import { z } from 'zod';
import { readJson } from '$lib/server/request';
import { verifyCancelTransaction } from '$lib/server/services/escrow';
import { sql } from 'drizzle-orm';

const inputSchema = z
  .object({
    txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
    rejections: z
      .array(
        z.object({
          submissionId: z.string().uuid(),
          reason: z.string().min(3).max(1000)
        })
      )
      .default([])
  })
  .optional();

export async function POST(event) {
  const employer = await requireRole(event, 'employer');
  const body = await readJson<unknown>(event.request);

  if (!body.ok) {
    return body.response;
  }

  const parsed = inputSchema.safeParse(body.data);
  if (!parsed.success) {
    return badRequest('Invalid withdraw payload', parsed.error.flatten());
  }

  try {
    const bounty = await db.query.bounties.findFirst({
      where: and(eq(bounties.id, event.params.id), eq(bounties.employerId, employer.id))
    });

    if (!bounty) {
      return notFound('Bounty not found');
    }

    if (bounty.status !== 'open') {
      return conflict('Only open bounties can be cancelled');
    }

    if (bounty.onchainBountyId) {
      if (!parsed.data?.txHash) {
        return badRequest('Cancellation txHash is required for funded bounties');
      }

      await verifyCancelTransaction({
        txHash: parsed.data.txHash as `0x${string}`,
        expectedOnchainBountyId: bounty.onchainBountyId
      });
    }

    const rejectionMap = new Map(
      (parsed.data?.rejections ?? []).map((item) => [item.submissionId, item.reason])
    );

    await db.transaction(async (tx) => {
      const lockResult = await tx.execute(sql`
        SELECT id, status
        FROM bounties
        WHERE id = ${bounty.id} AND employer_id = ${employer.id}
        FOR UPDATE
      `);

      const locked = (lockResult as unknown as { rows?: Array<{ id: string; status: string }> }).rows?.[0];
      if (!locked) {
        throw new Error('NOT_FOUND');
      }

      if (locked.status !== 'open') {
        throw new Error('NOT_OPEN');
      }

      const existingSubmissions = await tx
        .select({ id: submissions.id })
        .from(submissions)
        .where(eq(submissions.bountyId, bounty.id));

      const existingIds = new Set(existingSubmissions.map((submission) => submission.id));
      const providedIds = new Set(rejectionMap.keys());

      if (existingIds.size !== providedIds.size) {
        throw new Error('REJECTIONS_REQUIRED');
      }

      for (const id of existingIds) {
        if (!providedIds.has(id)) {
          throw new Error('REJECTIONS_REQUIRED');
        }
      }

      for (const submissionId of existingIds) {
        const reason = rejectionMap.get(submissionId);
        if (!reason) {
          throw new Error('REJECTIONS_REQUIRED');
        }

        await tx
          .update(submissions)
          .set({
            isWinner: false,
            reviewStatus: 'rejected',
            rejectionReason: reason,
            reviewedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(submissions.id, submissionId));
      }

      await tx
        .update(bounties)
        .set({
          status: 'cancelled',
          updatedAt: new Date()
        })
        .where(eq(bounties.id, bounty.id));
    });

    const grants = await db
      .select({
        bountyId: githubAccessGrants.bountyId,
        candidateId: githubAccessGrants.candidateId,
        githubUsername: users.githubUsername
      })
      .from(githubAccessGrants)
      .innerJoin(users, eq(users.id, githubAccessGrants.candidateId))
      .where(eq(githubAccessGrants.bountyId, bounty.id));

    await Promise.all(
      grants.map((grant) =>
        enqueue('github_access_revoke', {
          bountyId: grant.bountyId,
          candidateId: grant.candidateId,
          candidateGithubUsername: grant.githubUsername
        })
      )
    );

    await writeAuditLog('bounty.withdrawn', {
      bountyId: bounty.id,
      employerId: employer.id,
      txHash: parsed.data?.txHash ?? null,
      rejectedSubmissionCount: parsed.data?.rejections?.length ?? 0
    });

    try {
      for (const grant of grants) {
        const candidate = await db.query.users.findFirst({ where: eq(users.id, grant.candidateId) });
        if (candidate?.email) {
          await enqueue(QUEUE_NAMES.sendEmail, {
            to: candidate.email,
            template: 'bounty_cancelled',
            data: { title: bounty.jobTitle }
          });
        }
      }
    } catch (e) {
      console.error('[notify] Failed to enqueue cancel emails:', e);
    }

    return json({ ok: true });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'NOT_FOUND') {
        return notFound('Bounty not found');
      }

      if (err.message === 'NOT_OPEN') {
        return conflict('Only open bounties can be cancelled');
      }

      if (err.message === 'REJECTIONS_REQUIRED') {
        return conflict('All current submissions must be explicitly rejected to cancel');
      }
    }

    console.error('Withdraw failed', err);
    return serverError('Failed to cancel bounty');
  }
}
