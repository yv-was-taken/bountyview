import { json } from '@sveltejs/kit';
import { verifyGitHubWebhookSignature } from '$lib/server/services/github-webhook';
import { enqueue } from '$lib/server/queue';

export async function POST(event) {
  const signature = event.request.headers.get('x-hub-signature-256');
  const delivery = event.request.headers.get('x-github-delivery');
  const githubEvent = event.request.headers.get('x-github-event');
  const rawBody = await event.request.text();

  if (!verifyGitHubWebhookSignature(rawBody, signature)) {
    return json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  await enqueue('retry_failed_integrations', {
    source: 'github_webhook',
    delivery,
    event: githubEvent,
    payload
  });

  return json({ ok: true });
}
