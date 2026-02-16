import { and, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { db, employerBlocks, githubAccessGrants, githubRepos, submissions } from '@bountyview/db';
import { submitBountyInputSchema } from '@bountyview/shared';
import { requireRole } from '$lib/server/auth-guard';
import { badRequest, conflict, forbidden, notFound, serverError } from '$lib/server/http';
import { readJson } from '$lib/server/request';
import { getPullRequestArtifacts } from '$lib/server/services/github';
import { writeAuditLog } from '$lib/server/audit';
import { sql } from 'drizzle-orm';

function parseRepoFullNameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'github.com') {
      return null;
    }

    const [owner, repoRaw] = parsed.pathname.replace(/^\/+/, '').split('/');
    if (!owner || !repoRaw) {
      return null;
    }

    const repo = repoRaw.replace(/\.git$/i, '');
    return `${owner}/${repo}`;
  } catch {
    return null;
  }
}

function parsePrRepoFullName(prUrl: string): string | null {
  const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/\d+/i);
  if (!match) {
    return null;
  }

  return `${match[1]}/${match[2]}`;
}

export async function POST(event) {
  const candidate = await requireRole(event, 'candidate');

  const body = await readJson<unknown>(event.request);
  if (!body.ok) {
    return body.response;
  }

  const parsed = submitBountyInputSchema.safeParse(body.data);
  if (!parsed.success) {
    return badRequest('Invalid submission payload', parsed.error.flatten());
  }

  const repoRecord = await db.query.githubRepos.findFirst({
    where: eq(githubRepos.bountyId, event.params.id)
  });
  if (!repoRecord) {
    return conflict('Claim bounty access before submitting');
  }

  const grant = await db.query.githubAccessGrants.findFirst({
    where: and(eq(githubAccessGrants.bountyId, event.params.id), eq(githubAccessGrants.candidateId, candidate.id))
  });
  if (!grant || grant.revokedAt) {
    return conflict('Claim bounty access before submitting');
  }

  const submittedRepoFullName = parseRepoFullNameFromUrl(parsed.data.githubRepoUrl);
  if (!submittedRepoFullName || submittedRepoFullName.toLowerCase() !== repoRecord.repoFullName.toLowerCase()) {
    return conflict('Repository URL must match the bounty repository');
  }

  const prRepoFullName = parsePrRepoFullName(parsed.data.githubPrUrl);
  if (!prRepoFullName || prRepoFullName.toLowerCase() !== repoRecord.repoFullName.toLowerCase()) {
    return conflict('Pull request must target the bounty repository');
  }

  try {
    const prArtifacts = await getPullRequestArtifacts(parsed.data.githubPrUrl);

    if ((prArtifacts.baseRepoFullName ?? '').toLowerCase() !== repoRecord.repoFullName.toLowerCase()) {
      return conflict('PR base repository does not match the bounty repository');
    }

    if ((prArtifacts.headRepoFullName ?? '').toLowerCase() !== repoRecord.repoFullName.toLowerCase()) {
      return conflict('PR head repository must be the bounty repository');
    }

    if (prArtifacts.headRef !== grant.branchName) {
      return conflict('PR branch must match your assigned bounty branch');
    }

    if ((prArtifacts.prAuthorLogin ?? '').toLowerCase() !== candidate.githubUsername.toLowerCase()) {
      return conflict('PR author must match the candidate GitHub account');
    }

    const inserted = await db.transaction(async (tx) => {
      const lockResult = await tx.execute(sql`
        SELECT id, employer_id, status, submission_deadline
        FROM bounties
        WHERE id = ${event.params.id}
        FOR UPDATE
      `);

      const lockedBounty = (lockResult as { rows?: Array<{ id: string; employer_id: string; status: string; submission_deadline: Date }> }).rows?.[0];
      if (!lockedBounty) {
        throw new Error('NOT_FOUND');
      }

      if (lockedBounty.status !== 'open') {
        throw new Error('NOT_OPEN');
      }

      if (new Date() > new Date(lockedBounty.submission_deadline)) {
        throw new Error('DEADLINE_PASSED');
      }

      const blocked = await tx.query.employerBlocks.findFirst({
        where: and(
          eq(employerBlocks.employerId, lockedBounty.employer_id),
          eq(employerBlocks.candidateId, candidate.id)
        )
      });

      if (blocked) {
        throw new Error('BLOCKED');
      }

      const grantCheck = await tx.query.githubAccessGrants.findFirst({
        where: and(
          eq(githubAccessGrants.bountyId, lockedBounty.id),
          eq(githubAccessGrants.candidateId, candidate.id)
        )
      });

      if (!grantCheck || grantCheck.revokedAt) {
        throw new Error('NO_GRANT');
      }

      const upserted = await tx
        .insert(submissions)
        .values({
          bountyId: lockedBounty.id,
          candidateId: candidate.id,
          githubRepoUrl: parsed.data.githubRepoUrl,
          githubPrUrl: parsed.data.githubPrUrl,
          customDeliverables: {
            custom: parsed.data.customDeliverables ?? [],
            prArtifacts
          },
          reviewStatus: 'pending',
          rejectionReason: null,
          reviewedAt: null
        })
        .onConflictDoUpdate({
          target: [submissions.bountyId, submissions.candidateId],
          set: {
            githubRepoUrl: parsed.data.githubRepoUrl,
            githubPrUrl: parsed.data.githubPrUrl,
            customDeliverables: {
              custom: parsed.data.customDeliverables ?? [],
              prArtifacts
            },
            submittedAt: new Date(),
            reviewStatus: 'pending',
            rejectionReason: null,
            reviewedAt: null,
            updatedAt: new Date()
          }
        })
        .returning({
          id: submissions.id,
          bountyId: submissions.bountyId
        });

      return upserted[0];
    });

    if (!inserted) {
      return serverError('Failed to submit bounty');
    }

    const submissionId = inserted.id;

    await writeAuditLog('submission.created', {
      submissionId,
      bountyId: inserted.bountyId,
      candidateId: candidate.id
    });

    return json({ ok: true, submissionId }, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'NOT_FOUND') {
        return notFound('Bounty not found');
      }

      if (err.message === 'NOT_OPEN') {
        return conflict('Bounty is not accepting submissions');
      }

      if (err.message === 'DEADLINE_PASSED') {
        return conflict('Submission deadline has passed');
      }

      if (err.message === 'BLOCKED') {
        return forbidden('You are blocked from this employer\'s bounties');
      }

      if (err.message === 'NO_GRANT') {
        return conflict('Claim bounty access before submitting');
      }
    }

    console.error('Submit failed', err);
    return serverError('Failed to submit bounty');
  }
}
