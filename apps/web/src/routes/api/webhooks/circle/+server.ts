import { eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { db, payouts } from '@bountyview/db';
import { verifyCircleWebhookSignature } from '$lib/server/services/circle';

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

  await db
    .update(payouts)
    .set({
      status: normalizeStatus(status),
      updatedAt: new Date(),
      metadata: {
        ...(typeof payload === 'object' ? payload : {}),
        lastWebhookAt: new Date().toISOString()
      }
    })
    .where(eq(payouts.externalRef, transferId));

  return json({ ok: true });
}
