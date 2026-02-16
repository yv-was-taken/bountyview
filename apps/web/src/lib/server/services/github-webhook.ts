import crypto from 'node:crypto';
import { getEnv } from '../env';

export function verifyGitHubWebhookSignature(body: string, signature256: string | null): boolean {
  if (!signature256) {
    return false;
  }

  const env = getEnv();
  const hmac = crypto.createHmac('sha256', env.GITHUB_APP_WEBHOOK_SECRET);
  const digest = `sha256=${hmac.update(body).digest('hex')}`;

  const digestBuffer = Buffer.from(digest);
  const signatureBuffer = Buffer.from(signature256);

  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
}
