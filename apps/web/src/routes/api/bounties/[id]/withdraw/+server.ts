import { and, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { bounties, db, githubAccessGrants, users } from '@bountyview/db';
import { requireRole } from '$lib/server/auth-guard';
import { badRequest, conflict, notFound, serverError } from '$lib/server/http';
import { enqueue } from '$lib/server/queue';
import { writeAuditLog } from '$lib/server/audit';
import { z } from 'zod';
import { readJson } from '$lib/server/request';

const inputSchema = z
  .object({
    txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional()
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

  const bounty = await db.query.bounties.findFirst({
    where: and(eq(bounties.id, event.params.id), eq(bounties.employerId, employer.id))
  });

  if (!bounty) {
    return notFound('Bounty not found');
  }

  if (bounty.status !== 'open') {
    return conflict('Only open bounties can be cancelled');
  }

  try {
    await db
      .update(bounties)
      .set({
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(bounties.id, bounty.id));

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
      txHash: parsed.data?.txHash ?? null
    });

    return json({ ok: true });
  } catch (err) {
    console.error('Withdraw failed', err);
    return serverError('Failed to cancel bounty');
  }
}
