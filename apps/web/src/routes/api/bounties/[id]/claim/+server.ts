import { and, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { bounties, bountyFunding, db, users } from '@bountyview/db';
import { requireRole } from '$lib/server/auth-guard';
import { conflict, forbidden, notFound, serverError } from '$lib/server/http';
import { ensureBountyRepo, grantCandidateRepoAccess } from '$lib/server/services/github';
import { isCandidateBlocked } from '@bountyview/db';
import { enqueue } from '$lib/server/queue';
import { QUEUE_NAMES } from '@bountyview/shared';

export async function POST(event) {
  const candidate = await requireRole(event, 'candidate');

  const bounty = await db.query.bounties.findFirst({ where: eq(bounties.id, event.params.id) });
  if (!bounty) {
    return notFound('Bounty not found');
  }

  if (bounty.status !== 'open') {
    return conflict('Bounty is not open');
  }

  const now = new Date();
  if (now > bounty.submissionDeadline) {
    return conflict('Submission deadline has passed');
  }

  if (!bounty.onchainBountyId) {
    return conflict('Bounty funding is not confirmed on-chain');
  }

  const fundingRecord = await db.query.bountyFunding.findFirst({
    where: eq(bountyFunding.bountyId, bounty.id)
  });
  if (!fundingRecord) {
    return conflict('Bounty funding is not confirmed on-chain');
  }

  const blocked = await isCandidateBlocked(bounty.employerId, candidate.id);
  if (blocked) {
    return forbidden('You are blocked from this employer\'s bounties');
  }

  const employer = await db.query.users.findFirst({ where: eq(users.id, bounty.employerId) });
  const candidateUser = await db.query.users.findFirst({ where: eq(users.id, candidate.id) });

  if (!employer || !candidateUser) {
    return notFound('User record missing');
  }

  try {
    const repo = await ensureBountyRepo({
      bountyId: bounty.id,
      employerGithubUsername: employer.githubUsername,
      repoTemplateUrl: bounty.repoTemplateUrl
    });

    const grant = await grantCandidateRepoAccess({
      bountyId: bounty.id,
      candidateId: candidate.id,
      candidateGithubUsername: candidateUser.githubUsername
    });

    try {
      if (employer.email) {
        await enqueue(QUEUE_NAMES.sendEmail, {
          to: employer.email,
          template: 'bounty_claimed',
          data: { candidate: candidateUser.githubUsername, title: bounty.jobTitle }
        });
      }
    } catch (e) {
      console.error('[notify] Failed to enqueue claim email:', e);
    }

    return json({
      ok: true,
      repoUrl: repo.repoUrl,
      repoFullName: repo.repoFullName,
      branchName: grant.branchName
    });
  } catch (err) {
    console.error('Claim failed', err);
    return serverError('Failed to claim bounty');
  }
}
