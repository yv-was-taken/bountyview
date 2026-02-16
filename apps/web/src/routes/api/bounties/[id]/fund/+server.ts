import { and, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { bounties, bountyFunding, db } from '@bountyview/db';
import { requireRole } from '$lib/server/auth-guard';
import { badRequest, notFound, serverError } from '$lib/server/http';
import { readJson } from '$lib/server/request';
import { enqueue } from '$lib/server/queue';
import { writeAuditLog } from '$lib/server/audit';

const inputSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  onchainBountyId: z.union([z.number().int().nonnegative(), z.string().min(1)]),
  chainId: z.number().int().positive().optional(),
  escrowAmount: z.number().positive().optional()
});

export async function POST(event) {
  const employer = await requireRole(event, 'employer');

  const body = await readJson<unknown>(event.request);
  if (!body.ok) {
    return body.response;
  }

  const parsed = inputSchema.safeParse(body.data);
  if (!parsed.success) {
    return badRequest('Invalid funding payload', parsed.error.flatten());
  }

  const bounty = await db.query.bounties.findFirst({
    where: and(eq(bounties.id, event.params.id), eq(bounties.employerId, employer.id))
  });

  if (!bounty) {
    return notFound('Bounty not found');
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(bountyFunding)
        .values({
          bountyId: bounty.id,
          txHash: parsed.data.txHash,
          chainId: parsed.data.chainId ?? 8453,
          escrowAmount: (parsed.data.escrowAmount ?? Number(bounty.bountyAmountUsdc)).toFixed(6)
        })
        .onConflictDoNothing();

      await tx
        .update(bounties)
        .set({
          onchainBountyId: String(parsed.data.onchainBountyId),
          updatedAt: new Date()
        })
        .where(eq(bounties.id, bounty.id));
    });

    await enqueue('sync_escrow_events', {
      trigger: 'manual_funding',
      bountyId: bounty.id,
      txHash: parsed.data.txHash
    });

    await writeAuditLog('bounty.funded', {
      bountyId: bounty.id,
      employerId: employer.id,
      txHash: parsed.data.txHash
    });

    return json({ ok: true });
  } catch (err) {
    console.error('Funding link failed', err);
    return serverError('Failed to register funding transaction');
  }
}
