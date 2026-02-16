import { desc, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { db, payouts } from '@bountyview/db';
import { requireRole } from '$lib/server/auth-guard';

export async function GET(event) {
  const candidate = await requireRole(event, 'candidate');

  const rows = await db
    .select()
    .from(payouts)
    .where(eq(payouts.candidateId, candidate.id))
    .orderBy(desc(payouts.createdAt));

  return json({ payouts: rows });
}
