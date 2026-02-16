import type { PageServerLoad } from './$types';
import { db, bountyTemplates } from '@bountyview/db';
import { desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
  const templates = await db.select().from(bountyTemplates).orderBy(desc(bountyTemplates.createdAt)).limit(25);
  return { templates };
};
