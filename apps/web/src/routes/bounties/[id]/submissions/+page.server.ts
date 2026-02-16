import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listEmployerSubmissions } from '@bountyview/db';
import { requireRole } from '$lib/server/auth-guard';

export const load: PageServerLoad = async (event) => {
  const user = await requireRole(event, 'employer');
  const submissions = await listEmployerSubmissions(user.id, event.params.id);

  if (!submissions) {
    error(404, 'No submissions found');
  }

  return {
    submissions,
    bountyId: event.params.id
  };
};
