import { eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { db, payouts, users } from '@bountyview/db';
import { verifyCircleWebhookSignature } from '$lib/server/services/circle';
import { enqueue } from '$lib/server/queue';
import { QUEUE_NAMES } from '@bountyview/shared';

function normalizeStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
  const mapped = status.toLowerCase();
  if (mapped === 'complete' || mapped === 'completed') return 'completed';
  if (mapped === 'failed') return 'failed';
  if (mapped === 'cancelled') return 'cancelled';
  if (mapped === 'processing') return 'processing';
  return 'pending';
}

export async function POST(event) {
  const signature =
    event.request.headers.get('x-circle-signature') ?? event.request.headers.get('circle-signature');
  const rawBody = await event.request.text();

  if (!verifyCircleWebhookSignature(signature, rawBody)) {
    return json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: {
    notificationType?: string;
    transfer?: { id?: string; status?: string };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const transferId = payload.transfer?.id;
  const status = payload.transfer?.status;

  if (!transferId || !status) {
    return json({ ok: true });
  }

  const normalizedStatus = normalizeStatus(status);

  await db
    .update(payouts)
    .set({
      status: normalizedStatus,
      updatedAt: new Date(),
      metadata: {
        ...(typeof payload === 'object' ? payload : {}),
        lastWebhookAt: new Date().toISOString()
      }
    })
    .where(eq(payouts.externalRef, transferId));

  if (normalizedStatus === 'completed' || normalizedStatus === 'failed') {
    try {
      const payout = await db.query.payouts.findFirst({ where: eq(payouts.externalRef, transferId) });
      if (payout) {
        const candidate = await db.query.users.findFirst({ where: eq(users.id, payout.candidateId) });
        if (candidate?.email && candidate.emailNotifications) {
          const template = normalizedStatus === 'completed' ? 'payout_completed' : 'payout_failed';
          await enqueue(QUEUE_NAMES.sendEmail, {
            to: candidate.email,
            template,
            data: { amount: String(payout.amountUsdc), walletUrl: '/wallet' }
          });
        }
      }
    } catch (e) {
      console.error('[notify] Failed to enqueue payout email:', e);
    }
  }

  return json({ ok: true });
}
