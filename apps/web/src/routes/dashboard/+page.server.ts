import type { PageServerLoad } from './$types';
import { desc, eq } from 'drizzle-orm';
import {
  bounties,
  db,
  employerBlocks,
  payouts,
  submissions,
  users
} from '@bountyview/db';
import { requireAuth } from '$lib/server/auth-guard';

export const load: PageServerLoad = async (event) => {
  const user = await requireAuth(event);

  if (user.role === 'employer') {
    const ownBounties = await db
      .select()
      .from(bounties)
      .where(eq(bounties.employerId, user.id))
      .orderBy(desc(bounties.createdAt));

    const blockedCandidates = await db
      .select({
        candidateId: employerBlocks.candidateId,
        reason: employerBlocks.reason,
        githubUsername: users.githubUsername,
        createdAt: employerBlocks.createdAt
      })
      .from(employerBlocks)
      .innerJoin(users, eq(users.id, employerBlocks.candidateId))
      .where(eq(employerBlocks.employerId, user.id))
      .orderBy(desc(employerBlocks.createdAt));

    return { role: 'employer', ownBounties, blockedCandidates };
  }

  const mySubmissions = await db
    .select({
      id: submissions.id,
      bountyId: submissions.bountyId,
      githubRepoUrl: submissions.githubRepoUrl,
      githubPrUrl: submissions.githubPrUrl,
      submittedAt: submissions.submittedAt,
      isWinner: submissions.isWinner,
      bountyTitle: bounties.jobTitle
    })
    .from(submissions)
    .innerJoin(bounties, eq(bounties.id, submissions.bountyId))
    .where(eq(submissions.candidateId, user.id))
    .orderBy(desc(submissions.submittedAt));

  const myPayouts = await db
    .select()
    .from(payouts)
    .where(eq(payouts.candidateId, user.id))
    .orderBy(desc(payouts.createdAt));

  return { role: 'candidate', mySubmissions, myPayouts };
};
