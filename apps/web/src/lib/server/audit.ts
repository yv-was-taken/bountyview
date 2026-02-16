export type AuditAction =
  | 'bounty.created'
  | 'bounty.funded'
  | 'bounty.withdrawn'
  | 'bounty.claimed'
  | 'submission.created'
  | 'candidate.blocked'
  | 'candidate.unblocked'
  | 'circle.withdraw.requested';

export async function writeAuditLog(action: AuditAction, payload: Record<string, unknown>): Promise<void> {
  // Placeholder for external log sink integration.
  console.info('[audit]', action, payload);
}
