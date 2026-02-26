export interface SyncEscrowPayload {
  fromBlock?: string;
  toBlock?: string;
}

export interface ReconcilePayload {
  nowIso?: string;
}

export interface GithubAccessRevokePayload {
  bountyId: string;
  candidateId: string;
  candidateGithubUsername: string;
}

export interface CirclePollPayload {
  payoutId: string;
  externalRef: string;
}

export interface SendEmailPayload {
  to: string;
  template:
    | 'bounty_claimed'
    | 'submission_received'
    | 'winner_selected'
    | 'bounty_cancelled'
    | 'payout_completed'
    | 'payout_failed';
  data: Record<string, string>;
}
