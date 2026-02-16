import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getBountyById } from '@bountyview/db';

export const load: PageServerLoad = async ({ params }) => {
  const bounty = await getBountyById(params.id);

  if (!bounty) {
    error(404, 'Bounty not found');
  }

  return { bounty };
};
