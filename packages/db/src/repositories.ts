import { and, desc, eq, gte, ilike, inArray, lte, sql } from 'drizzle-orm';
import type { BountyFilters } from '@bountyview/shared';
import { db } from './client';
import {
  bounties,
  bountyTags,
  companies,
  employerBlocks,
  githubAccessGrants,
  submissions,
  users
} from './schema';

export async function listOpenBounties(filters: BountyFilters = {}) {
  const clauses = [eq(bounties.status, 'open')];
  let filteredBountyIds: string[] | undefined;

  if (filters.level) {
    clauses.push(eq(bounties.roleLevel, filters.level));
  }

  if (filters.minAmount !== undefined) {
    clauses.push(gte(bounties.bountyAmountUsdc, String(filters.minAmount)));
  }

  if (filters.maxAmount !== undefined) {
    clauses.push(lte(bounties.bountyAmountUsdc, String(filters.maxAmount)));
  }

  if (filters.tags && filters.tags.length > 0) {
    const matchingTags = await db
      .select({ bountyId: bountyTags.bountyId })
      .from(bountyTags)
      .where(inArray(bountyTags.tag, filters.tags));

    filteredBountyIds = [...new Set(matchingTags.map((row) => row.bountyId))];

    if (filteredBountyIds.length === 0) {
      return [];
    }

    clauses.push(inArray(bounties.id, filteredBountyIds));
  }

  return db
    .select({
      id: bounties.id,
      jobTitle: bounties.jobTitle,
      roleLevel: bounties.roleLevel,
      bountyAmountUsdc: bounties.bountyAmountUsdc,
      submissionDeadline: bounties.submissionDeadline,
      companyName: companies.name,
      status: bounties.status
    })
    .from(bounties)
    .innerJoin(companies, eq(bounties.companyId, companies.id))
    .where(and(...clauses))
    .orderBy(desc(bounties.createdAt));
}

export async function getBountyById(bountyId: string) {
  const rows = await db
    .select({
      id: bounties.id,
      onchainBountyId: bounties.onchainBountyId,
      employerId: bounties.employerId,
      companyId: bounties.companyId,
      jobTitle: bounties.jobTitle,
      roleLevel: bounties.roleLevel,
      taskDescription: bounties.taskDescription,
      taskSource: bounties.taskSource,
      templateId: bounties.templateId,
      repoTemplateUrl: bounties.repoTemplateUrl,
      deliverables: bounties.deliverables,
      bountyAmountUsdc: bounties.bountyAmountUsdc,
      submissionDeadline: bounties.submissionDeadline,
      gracePeriodDays: bounties.gracePeriodDays,
      whatHappensAfter: bounties.whatHappensAfter,
      status: bounties.status,
      createdAt: bounties.createdAt,
      updatedAt: bounties.updatedAt,
      companyName: companies.name,
      companyDescription: companies.description,
      submissionCount: sql<number>`count(${submissions.id})`
    })
    .from(bounties)
    .innerJoin(companies, eq(bounties.companyId, companies.id))
    .leftJoin(submissions, eq(submissions.bountyId, bounties.id))
    .where(eq(bounties.id, bountyId))
    .groupBy(bounties.id, companies.id)
    .limit(1);

  if (!rows[0]) {
    return null;
  }

  const tags = await db
    .select({ tag: bountyTags.tag })
    .from(bountyTags)
    .where(eq(bountyTags.bountyId, bountyId));

  return {
    ...rows[0],
    tags: tags.map((tag) => tag.tag)
  };
}

export async function listEmployerSubmissions(employerId: string, bountyId: string) {
  return db
    .select({
      id: submissions.id,
      candidateId: submissions.candidateId,
      githubRepoUrl: submissions.githubRepoUrl,
      githubPrUrl: submissions.githubPrUrl,
      customDeliverables: submissions.customDeliverables,
      submittedAt: submissions.submittedAt,
      isWinner: submissions.isWinner,
      reviewStatus: submissions.reviewStatus,
      rejectionReason: submissions.rejectionReason,
      reviewedAt: submissions.reviewedAt,
      candidateGithubUsername: users.githubUsername,
      candidateAvatarUrl: users.avatarUrl
    })
    .from(submissions)
    .innerJoin(users, eq(submissions.candidateId, users.id))
    .innerJoin(bounties, eq(submissions.bountyId, bounties.id))
    .where(and(eq(submissions.bountyId, bountyId), eq(bounties.employerId, employerId)))
    .orderBy(desc(submissions.submittedAt));
}

export async function isCandidateBlocked(employerId: string, candidateId: string) {
  const block = await db
    .select({ id: employerBlocks.id })
    .from(employerBlocks)
    .where(and(eq(employerBlocks.employerId, employerId), eq(employerBlocks.candidateId, candidateId)))
    .limit(1);

  return Boolean(block[0]);
}

export async function findUserByGithubId(githubId: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.githubId, githubId))
    .limit(1);

  return rows[0] ?? null;
}

export async function listEmployerBlocks(employerId: string) {
  return db
    .select({
      candidateId: employerBlocks.candidateId,
      reason: employerBlocks.reason,
      createdAt: employerBlocks.createdAt,
      githubUsername: users.githubUsername,
      avatarUrl: users.avatarUrl
    })
    .from(employerBlocks)
    .innerJoin(users, eq(users.id, employerBlocks.candidateId))
    .where(eq(employerBlocks.employerId, employerId))
    .orderBy(desc(employerBlocks.createdAt));
}

export async function getCandidateGrant(bountyId: string, candidateId: string) {
  const rows = await db
    .select()
    .from(githubAccessGrants)
    .where(and(eq(githubAccessGrants.bountyId, bountyId), eq(githubAccessGrants.candidateId, candidateId)))
    .limit(1);

  return rows[0] ?? null;
}

export async function searchCompaniesByName(name: string) {
  return db
    .select()
    .from(companies)
    .where(ilike(companies.name, `%${name}%`))
    .orderBy(companies.name)
    .limit(10);
}
