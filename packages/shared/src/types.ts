export const ROLE_VALUES = ['employer', 'candidate'] as const;
export type UserRole = (typeof ROLE_VALUES)[number];

export const ROLE_LEVEL_VALUES = ['junior', 'mid', 'senior', 'staff', 'lead'] as const;
export type RoleLevel = (typeof ROLE_LEVEL_VALUES)[number];

export const TASK_SOURCE_VALUES = ['custom', 'template'] as const;
export type TaskSource = (typeof TASK_SOURCE_VALUES)[number];

export const BOUNTY_STATUS_VALUES = ['open', 'claimed', 'cancelled', 'expired'] as const;
export type BountyStatus = (typeof BOUNTY_STATUS_VALUES)[number];

export const DELIVERABLE_TYPE_VALUES = [
  'code_only',
  'commit_history_and_pr',
  'decision_log',
  'custom'
] as const;
export type DeliverableType = (typeof DELIVERABLE_TYPE_VALUES)[number];

export interface DeliverableItem {
  type: DeliverableType;
  label: string;
  description?: string | undefined;
}

export interface AuthUser {
  id: string;
  githubId: number;
  githubUsername: string;
  role: UserRole;
  companyId: string | null;
  termsAcceptedAt: string | null;
}

export interface BountyFilters {
  level?: RoleLevel | undefined;
  minAmount?: number | undefined;
  maxAmount?: number | undefined;
  tags?: string[] | undefined;
}

export const QUEUE_NAMES = {
  syncEscrowEvents: 'sync_escrow_events',
  reconcileBountyState: 'reconcile_bounty_state',
  githubRepoProvision: 'github_repo_provision',
  githubAccessRevoke: 'github_access_revoke',
  circleWithdrawStatusPoll: 'circle_withdraw_status_poll',
  retryFailedIntegrations: 'retry_failed_integrations',
  recoverOrphanedPayouts: 'recover_orphaned_payouts'
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const CIRCLE_PAYOUT_STATUS_VALUES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled'
] as const;
export type CirclePayoutStatus = (typeof CIRCLE_PAYOUT_STATUS_VALUES)[number];
