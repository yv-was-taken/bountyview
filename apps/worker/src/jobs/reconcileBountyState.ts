import { and, eq } from 'drizzle-orm';
import { bounties, db } from '@bountyview/db';
import type { ReconcilePayload } from './types';

export async function reconcileBountyState(payload: ReconcilePayload = {}) {
  const now = payload.nowIso ? new Date(payload.nowIso) : new Date();

  const openBounties = await db
    .select()
    .from(bounties)
    .where(eq(bounties.status, 'open'));

  for (const bounty of openBounties) {
    const expiry = new Date(bounty.submissionDeadline);
    expiry.setDate(expiry.getDate() + bounty.gracePeriodDays);

    if (now > expiry) {
      await db
        .update(bounties)
        .set({
          status: 'expired',
          updatedAt: new Date()
        })
        .where(and(eq(bounties.id, bounty.id), eq(bounties.status, 'open')));
    }
  }
}
