import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import { db, payouts } from '@bountyview/db';

/**
 * Finds Circle payouts stuck in 'pending' with no externalRef (meaning the
 * Circle API call was never made or its result was never recorded) and marks
 * them as 'failed' so they no longer block the candidate's available balance.
 */
export async function recoverOrphanedPayouts() {
  const fiveMinutesAgo = sql`now() - interval '5 minutes'`;

  const orphaned = await db
    .update(payouts)
    .set({
      status: 'failed',
      metadata: sql`coalesce(${payouts.metadata}, '{}'::jsonb) || '{"failureReason":"orphan_recovery"}'::jsonb`,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(payouts.provider, 'circle'),
        eq(payouts.status, 'pending'),
        isNull(payouts.externalRef),
        lt(payouts.createdAt, fiveMinutesAgo)
      )
    )
    .returning({ id: payouts.id, candidateId: payouts.candidateId });

  if (orphaned.length > 0) {
    console.info(
      `[recover_orphaned_payouts] Marked ${orphaned.length} orphaned payout(s) as failed:`,
      orphaned.map((p) => p.id)
    );
  } else {
    console.info('[recover_orphaned_payouts] No orphaned payouts found');
  }
}
