import { desc, eq } from 'drizzle-orm';
import { bounties, db, escrowEvents } from '@bountyview/db';
import { fetchEscrowEvents, latestBlock } from '../services/chain';
import type { SyncEscrowPayload } from './types';

function serializeBigInt(value: bigint): string {
  return value.toString();
}

export async function syncEscrowEvents(payload: SyncEscrowPayload = {}) {
  const currentBlock = payload.toBlock ? BigInt(payload.toBlock) : await latestBlock();

  const lastEvent = await db
    .select({ blockNumber: escrowEvents.blockNumber })
    .from(escrowEvents)
    .orderBy(desc(escrowEvents.createdAt))
    .limit(1);

  const fromBlock = payload.fromBlock
    ? BigInt(payload.fromBlock)
    : lastEvent[0]?.blockNumber
      ? BigInt(lastEvent[0].blockNumber) + 1n
      : currentBlock - 5000n > 0n
        ? currentBlock - 5000n
        : 0n;

  if (fromBlock > currentBlock) {
    return;
  }

  const events = await fetchEscrowEvents(fromBlock, currentBlock);

  await db.transaction(async (tx) => {
    for (const event of events.created) {
      const bountyId = event.args.bountyId?.toString();
      if (!bountyId) continue;

      await tx
        .insert(escrowEvents)
        .values({
          onchainBountyId: bountyId,
          eventType: 'BountyCreated',
          txHash: event.transactionHash,
          blockNumber: serializeBigInt(event.blockNumber),
          payload: {
            amount: event.args.amount?.toString(),
            employer: event.args.employer,
            deadline: event.args.deadline?.toString()
          }
        })
        .onConflictDoNothing();
    }

    for (const event of events.claimed) {
      const bountyId = event.args.bountyId?.toString();
      if (!bountyId) continue;

      await tx
        .insert(escrowEvents)
        .values({
          onchainBountyId: bountyId,
          eventType: 'BountyClaimed',
          txHash: event.transactionHash,
          blockNumber: serializeBigInt(event.blockNumber),
          payload: {
            amount: event.args.amount?.toString(),
            winner: event.args.winner
          }
        })
        .onConflictDoNothing();

      await tx
        .update(bounties)
        .set({
          status: 'claimed',
          updatedAt: new Date()
        })
        .where(eq(bounties.onchainBountyId, bountyId));
    }

    for (const event of events.cancelled) {
      const bountyId = event.args.bountyId?.toString();
      if (!bountyId) continue;

      await tx
        .insert(escrowEvents)
        .values({
          onchainBountyId: bountyId,
          eventType: 'BountyCancelled',
          txHash: event.transactionHash,
          blockNumber: serializeBigInt(event.blockNumber),
          payload: {}
        })
        .onConflictDoNothing();

      await tx
        .update(bounties)
        .set({
          status: 'cancelled',
          updatedAt: new Date()
        })
        .where(eq(bounties.onchainBountyId, bountyId));
    }

    for (const event of events.expired) {
      const bountyId = event.args.bountyId?.toString();
      if (!bountyId) continue;

      await tx
        .insert(escrowEvents)
        .values({
          onchainBountyId: bountyId,
          eventType: 'BountyExpired',
          txHash: event.transactionHash,
          blockNumber: serializeBigInt(event.blockNumber),
          payload: {}
        })
        .onConflictDoNothing();

      await tx
        .update(bounties)
        .set({
          status: 'expired',
          updatedAt: new Date()
        })
        .where(eq(bounties.onchainBountyId, bountyId));
    }
  });
}
