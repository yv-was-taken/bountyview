import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getBountyById } from '@bountyview/db';
import { requireRole } from '$lib/server/auth-guard';

export const load: PageServerLoad = async (event) => {
  await requireRole(event, 'candidate');

  const bounty = await getBountyById(event.params.id);
  if (!bounty) {
    error(404, 'Bounty not found');
  }

  return { bounty };
};
