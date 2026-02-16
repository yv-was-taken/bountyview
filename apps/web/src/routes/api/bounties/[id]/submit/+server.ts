import { and, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { bounties, db, submissions } from '@bountyview/db';
import { submitBountyInputSchema } from '@bountyview/shared';
import { requireRole } from '$lib/server/auth-guard';
import { badRequest, conflict, forbidden, notFound, serverError } from '$lib/server/http';
import { getCandidateGrant, isCandidateBlocked } from '@bountyview/db';
import { readJson } from '$lib/server/request';
import { getPullRequestArtifacts } from '$lib/server/services/github';
import { writeAuditLog } from '$lib/server/audit';

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

  const bounty = await db.query.bounties.findFirst({ where: eq(bounties.id, event.params.id) });

  if (!bounty) {
    return notFound('Bounty not found');
  }

  if (bounty.status !== 'open') {
    return conflict('Bounty is not accepting submissions');
  }

  const blocked = await isCandidateBlocked(bounty.employerId, candidate.id);
  if (blocked) {
    return forbidden('You are blocked from this employer\'s bounties');
  }

  const grant = await getCandidateGrant(bounty.id, candidate.id);
  if (!grant || grant.revokedAt) {
    return conflict('Claim bounty access before submitting');
  }

  try {
    let prArtifacts: Awaited<ReturnType<typeof getPullRequestArtifacts>> | null = null;
    try {
      prArtifacts = await getPullRequestArtifacts(parsed.data.githubPrUrl);
    } catch (err) {
      console.warn('Unable to fetch PR artifacts', err);
    }

    const inserted = await db
      .insert(submissions)
      .values({
        bountyId: bounty.id,
        candidateId: candidate.id,
        githubRepoUrl: parsed.data.githubRepoUrl,
        githubPrUrl: parsed.data.githubPrUrl,
        customDeliverables: {
          custom: parsed.data.customDeliverables ?? [],
          prArtifacts
        }
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
          updatedAt: new Date()
        }
      })
      .returning({
        id: submissions.id
      });

    const submissionId = inserted[0]?.id;

    await writeAuditLog('submission.created', {
      submissionId,
      bountyId: bounty.id,
      candidateId: candidate.id
    });

    return json({ ok: true, submissionId }, { status: 201 });
  } catch (err) {
    console.error('Submit failed', err);
    return serverError('Failed to submit bounty');
  }
}
