import { json } from '@sveltejs/kit';
import { getBountyById } from '@bountyview/db';
import { notFound } from '$lib/server/http';

export async function GET({ params }) {
  const bounty = await getBountyById(params.id);

  if (!bounty) {
    return notFound('Bounty not found');
  }

  return json({ bounty });
}
