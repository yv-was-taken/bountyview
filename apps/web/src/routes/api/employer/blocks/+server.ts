import { and, eq, isNull } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { bounties, db, employerBlocks, githubAccessGrants, users } from '@bountyview/db';
import { employerBlockInputSchema } from '@bountyview/shared';
import { requireRole } from '$lib/server/auth-guard';
import { badRequest, conflict, notFound, serverError } from '$lib/server/http';
import { readJson } from '$lib/server/request';
import { listEmployerBlocks } from '@bountyview/db';
import { enqueue } from '$lib/server/queue';
import { writeAuditLog } from '$lib/server/audit';

export async function GET(event) {
  const employer = await requireRole(event, 'employer');
  const blocks = await listEmployerBlocks(employer.id);

  return json({ blocks });
}

export async function POST(event) {
  const employer = await requireRole(event, 'employer');

  const body = await readJson<unknown>(event.request);
  if (!body.ok) {
    return body.response;
  }

  const parsed = employerBlockInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return badRequest('Invalid block payload', parsed.error.flatten());
  }

  const candidate = await db.query.users.findFirst({ where: eq(users.id, parsed.data.candidateId) });

  if (!candidate || candidate.role !== 'candidate') {
    return notFound('Candidate not found');
  }

  if (candidate.id === employer.id) {
    return conflict('You cannot block yourself');
  }

  try {
    await db
      .insert(employerBlocks)
      .values({
        employerId: employer.id,
        candidateId: candidate.id,
        reason: parsed.data.reason
      })
      .onConflictDoUpdate({
        target: [employerBlocks.employerId, employerBlocks.candidateId],
        set: {
          reason: parsed.data.reason,
          createdAt: new Date()
        }
      });

    const grants = await db
      .select({
        bountyId: githubAccessGrants.bountyId,
        candidateId: githubAccessGrants.candidateId,
        githubUsername: users.githubUsername
      })
      .from(githubAccessGrants)
      .innerJoin(bounties, eq(bounties.id, githubAccessGrants.bountyId))
      .innerJoin(users, eq(users.id, githubAccessGrants.candidateId))
      .where(
        and(
          eq(bounties.employerId, employer.id),
          eq(githubAccessGrants.candidateId, candidate.id),
          isNull(githubAccessGrants.revokedAt)
        )
      );

    await Promise.all(
      grants.map((grant) =>
        enqueue('github_access_revoke', {
          bountyId: grant.bountyId,
          candidateId: grant.candidateId,
          candidateGithubUsername: grant.githubUsername
        })
      )
    );

    await writeAuditLog('candidate.blocked', {
      employerId: employer.id,
      candidateId: candidate.id,
      reason: parsed.data.reason
    });

    return json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('Failed to block candidate', err);
    return serverError('Failed to block candidate');
  }
}
