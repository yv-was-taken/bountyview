import type { PageServerLoad } from './$types';
import { desc } from 'drizzle-orm';
import { bountyTemplates, db } from '@bountyview/db';

export const load: PageServerLoad = async () => {
  const templates = await db.select().from(bountyTemplates).orderBy(desc(bountyTemplates.createdAt));
  return { templates };
};
