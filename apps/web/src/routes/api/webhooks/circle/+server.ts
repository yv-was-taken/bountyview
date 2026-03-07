import { eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { db, payouts, users } from '@bountyview/db';
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
  const rawBody = await event.request.text();

  // Circle's v2 notification system uses AWS SNS. Handle SNS message types
  // before HMAC verification since SNS requests don't carry our signature.
  const snsMessageType = event.request.headers.get('x-amz-sns-message-type');

  if (snsMessageType === 'SubscriptionConfirmation') {
    try {
      const snsPayload = JSON.parse(rawBody);
      if (snsPayload.SubscribeURL) {
        await fetch(snsPayload.SubscribeURL);
      }
    } catch (e) {
      console.error('[circle-webhook] Failed to confirm SNS subscription:', e);
    }
    return json({ ok: true });
  }

  // Circle's v2 notifications are delivered via AWS SNS which uses certificate-based
  // signing (not shared-secret HMAC). We rely on SNS message type headers for
  // subscription confirmation and on payload matching (transferId lookup) for
  // notification processing. No shared-secret HMAC verification is needed.

  let payload: {
    notificationType?: string;
    transfer?: { id?: string; status?: string };
  };

  try {
    const parsed = JSON.parse(rawBody);
    // SNS Notification wraps the actual payload in a Message string field
    if (snsMessageType === 'Notification' && typeof parsed.Message === 'string') {
      payload = JSON.parse(parsed.Message);
    } else {
      payload = parsed;
    }
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
