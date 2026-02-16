import type { PageServerLoad } from './$types';
import { desc, eq } from 'drizzle-orm';
import { db, payouts } from '@bountyview/db';
import { requireAuth } from '$lib/server/auth-guard';

export const load: PageServerLoad = async (event) => {
  const user = await requireAuth(event);

  const records = await db
    .select()
    .from(payouts)
    .where(eq(payouts.candidateId, user.id))
    .orderBy(desc(payouts.createdAt));

  return { records };
};
