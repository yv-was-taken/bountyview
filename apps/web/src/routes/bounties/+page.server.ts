import type { PageServerLoad } from './$types';
import { listOpenBounties } from '@bountyview/db';

export const load: PageServerLoad = async ({ url }) => {
  const level = url.searchParams.get('level') ?? undefined;
  const minAmount = url.searchParams.get('minAmount');
  const maxAmount = url.searchParams.get('maxAmount');
  const tags = url.searchParams.get('tags')?.split(',').map((tag) => tag.trim()).filter(Boolean) ?? undefined;

  const bounties = await listOpenBounties({
    level: level as 'junior' | 'mid' | 'senior' | 'staff' | 'lead' | undefined,
    minAmount: minAmount ? Number(minAmount) : undefined,
    maxAmount: maxAmount ? Number(maxAmount) : undefined,
    tags
  });

  return {
    bounties,
    filters: { level, minAmount, maxAmount, tags: tags?.join(',') ?? '' }
  };
};
