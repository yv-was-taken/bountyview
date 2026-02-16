import { eq } from 'drizzle-orm';
import { db, payouts } from '@bountyview/db';
import { getTransferStatus } from '../services/circle';
import type { CirclePollPayload } from './types';

function normalizeStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
  const mapped = status.toLowerCase();
  if (mapped === 'complete' || mapped === 'completed') return 'completed';
  if (mapped === 'failed') return 'failed';
  if (mapped === 'cancelled') return 'cancelled';
  if (mapped === 'processing') return 'processing';
  return 'pending';
}

export async function pollCircleWithdraw(payload: CirclePollPayload) {
  const status = await getTransferStatus(payload.externalRef);
  const normalized = normalizeStatus(status);

  await db
    .update(payouts)
    .set({
      status: normalized,
      updatedAt: new Date()
    })
    .where(eq(payouts.id, payload.payoutId));

  if (normalized === 'pending' || normalized === 'processing') {
    throw new Error(`Transfer ${payload.externalRef} not terminal yet: ${normalized}`);
  }
}
