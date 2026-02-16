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
