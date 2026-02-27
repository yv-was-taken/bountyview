import type { DeliverableItem } from '@bountyview/shared';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    githubId: varchar('github_id', { length: 32 }).notNull().unique(),
    githubUsername: text('github_username').notNull(),
    avatarUrl: text('avatar_url'),
    email: text('email'),
    emailNotifications: boolean('email_notifications').default(true).notNull(),
    role: text('role').notNull(),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
    privyWalletAddress: varchar('privy_wallet_address', { length: 42 }),
    termsAcceptedAt: timestamp('terms_accepted_at', { withTimezone: true }),
    termsVersion: text('terms_version'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [check('users_role_check', sql`${table.role} in ('employer', 'candidate')`)]
);

export const bountyTemplates = pgTable('bounty_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  roleLevel: text('role_level').notNull(),
  tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
  repoTemplateUrl: text('repo_template_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const bounties = pgTable(
  'bounties',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    onchainBountyId: varchar('onchain_bounty_id', { length: 78 }).unique(),
    employerId: uuid('employer_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'restrict' }),
    jobTitle: text('job_title').notNull(),
    roleLevel: text('role_level').notNull(),
    taskDescription: text('task_description').notNull(),
    taskSource: text('task_source').notNull(),
    templateId: uuid('template_id').references(() => bountyTemplates.id, { onDelete: 'set null' }),
    repoTemplateUrl: text('repo_template_url'),
    deliverables: jsonb('deliverables').$type<DeliverableItem[]>().notNull(),
    bountyAmountUsdc: numeric('bounty_amount_usdc', { precision: 18, scale: 6 }).notNull(),
    submissionDeadline: timestamp('submission_deadline', { withTimezone: true }).notNull(),
    gracePeriodDays: integer('grace_period_days').notNull().default(7),
    whatHappensAfter: text('what_happens_after').notNull(),
    status: text('status').notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    check('bounties_role_level_check', sql`${table.roleLevel} in ('junior', 'mid', 'senior', 'staff', 'lead')`),
    check('bounties_task_source_check', sql`${table.taskSource} in ('custom', 'template')`),
    check('bounties_status_check', sql`${table.status} in ('open', 'claimed', 'cancelled', 'expired')`),
    index('bounties_status_idx').on(table.status),
    index('bounties_deadline_idx').on(table.submissionDeadline)
  ]
);

export const bountyTags = pgTable(
  'bounty_tags',
  {
    bountyId: uuid('bounty_id').notNull().references(() => bounties.id, { onDelete: 'cascade' }),
    tag: text('tag').notNull()
  },
  (table) => [primaryKey({ columns: [table.bountyId, table.tag] })]
);

export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bountyId: uuid('bounty_id').notNull().references(() => bounties.id, { onDelete: 'cascade' }),
    candidateId: uuid('candidate_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    githubRepoUrl: text('github_repo_url').notNull(),
    githubPrUrl: text('github_pr_url').notNull(),
    customDeliverables: jsonb('custom_deliverables'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
    isWinner: boolean('is_winner').notNull().default(false),
    reviewStatus: text('review_status').notNull().default('pending'),
    rejectionReason: text('rejection_reason'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    check('submissions_review_status_check', sql`${table.reviewStatus} in ('pending', 'rejected', 'winner')`),
    check('submissions_winner_consistency_check', sql`(${table.reviewStatus} = 'winner') = ${table.isWinner}`),
    unique('submissions_bounty_candidate_unique').on(table.bountyId, table.candidateId),
    index('submissions_bounty_idx').on(table.bountyId),
    index('submissions_candidate_idx').on(table.candidateId)
  ]
);

export const employerBlocks = pgTable(
  'employer_blocks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employerId: uuid('employer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    candidateId: uuid('candidate_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    unique('employer_blocks_unique').on(table.employerId, table.candidateId),
    index('employer_blocks_employer_idx').on(table.employerId),
    index('employer_blocks_candidate_idx').on(table.candidateId)
  ]
);

export const bountyFunding = pgTable(
  'bounty_funding',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bountyId: uuid('bounty_id').notNull().references(() => bounties.id, { onDelete: 'cascade' }).unique(),
    txHash: varchar('tx_hash', { length: 66 }).notNull().unique(),
    chainId: integer('chain_id').notNull(),
    escrowAmount: numeric('escrow_amount', { precision: 18, scale: 6 }).notNull(),
    fundedAt: timestamp('funded_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [check('bounty_funding_tx_hash_lower_check', sql`${table.txHash} = lower(${table.txHash})`)]
);

export const escrowEvents = pgTable(
  'escrow_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    onchainBountyId: varchar('onchain_bounty_id', { length: 78 }).notNull(),
    eventType: text('event_type').notNull(),
    txHash: varchar('tx_hash', { length: 66 }).notNull(),
    blockNumber: varchar('block_number', { length: 78 }).notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    unique('escrow_events_unique').on(table.txHash, table.eventType),
    index('escrow_events_onchain_idx').on(table.onchainBountyId)
  ]
);

export const githubRepos = pgTable('github_repos', {
  id: uuid('id').defaultRandom().primaryKey(),
  bountyId: uuid('bounty_id').notNull().references(() => bounties.id, { onDelete: 'cascade' }).unique(),
  repoFullName: text('repo_full_name').notNull().unique(),
  repoUrl: text('repo_url').notNull(),
  ownerType: text('owner_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const githubAccessGrants = pgTable(
  'github_access_grants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bountyId: uuid('bounty_id').notNull().references(() => bounties.id, { onDelete: 'cascade' }),
    candidateId: uuid('candidate_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    branchName: text('branch_name').notNull(),
    permission: text('permission').notNull().default('push'),
    grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    unique('github_access_grants_unique').on(table.bountyId, table.candidateId),
    index('github_access_grants_candidate_idx').on(table.candidateId)
  ]
);

export const payouts = pgTable(
  'payouts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    submissionId: uuid('submission_id').references(() => submissions.id, { onDelete: 'set null' }),
    candidateId: uuid('candidate_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    status: text('status').notNull().default('pending'),
    amountUsdc: numeric('amount_usdc', { precision: 18, scale: 6 }).notNull(),
    externalRef: text('external_ref'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    check('payouts_provider_check', sql`${table.provider} in ('circle', 'self_service')`),
    check('payouts_status_check', sql`${table.status} in ('pending', 'processing', 'completed', 'failed', 'cancelled')`),
    index('payouts_candidate_idx').on(table.candidateId)
  ]
);

export const jobRuns = pgTable('job_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  queueName: text('queue_name').notNull(),
  status: text('status').notNull(),
  payload: jsonb('payload'),
  error: text('error'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});
