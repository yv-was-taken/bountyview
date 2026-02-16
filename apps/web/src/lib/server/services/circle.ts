import { getEnv } from '../env';
import crypto from 'node:crypto';

interface CircleTransferResponse {
  id: string;
  status: string;
}

async function circleFetch(path: string, init: RequestInit = {}) {
  const env = getEnv();

  const res = await fetch(`https://api-sandbox.circle.com/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.CIRCLE_API_KEY}`,
      ...(init.headers ?? {})
    }
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Circle API error: ${res.status} ${body}`);
  }

  return res.json();
}

export async function createCircleWithdrawal(params: {
  idempotencyKey: string;
  amountUsd2: string;
  bankAccountId: string;
  destinationCurrency: string;
}): Promise<CircleTransferResponse> {
  const payload = {
    idempotencyKey: params.idempotencyKey,
    destination: {
      type: 'wire',
      id: params.bankAccountId
    },
    amount: {
      amount: params.amountUsd2,
      currency: 'USD'
    },
    source: {
      type: 'wallet'
    },
    toAmount: {
      currency: params.destinationCurrency,
      amount: params.amountUsd2
    }
  };

  const response = await circleFetch('/transfers', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return {
    id: response.data.id,
    status: response.data.status
  };
}

export async function getCircleTransferStatus(externalId: string): Promise<string> {
  const response = await circleFetch(`/transfers/${externalId}`);
  return response.data.status;
}

export function verifyCircleWebhookSignature(signature: string | null, body: string): boolean {
  if (!signature) {
    return false;
  }

  const env = getEnv();
  if (!env.CIRCLE_WEBHOOK_SECRET) {
    throw new Error('CIRCLE_WEBHOOK_SECRET is not configured');
  }
  if (!body.length) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', env.CIRCLE_WEBHOOK_SECRET);
  hmac.update(body);

  const expectedHex = hmac.digest('hex');
  const expectedBase64 = Buffer.from(expectedHex, 'hex').toString('base64');

  const candidates = signature
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .flatMap((segment) => {
      const separatorIndex = segment.indexOf('=');
      if (separatorIndex <= 0) {
        return [segment];
      }

      const key = segment.slice(0, separatorIndex).trim().toLowerCase();
      const value = segment.slice(separatorIndex + 1).trim();

      // Handle known keyed signatures while preserving raw signatures (including base64 padding '=').
      if (key === 'v1' || key === 'v0' || key === 'sha256' || key === 'signature' || key === 'sig') {
        return [value];
      }

      return [segment];
    })
    .map((candidate) => candidate.replace(/^sha256=/i, ''))
    .filter(Boolean);

  for (const candidate of candidates) {
    const normalizedCandidate = /^[a-fA-F0-9]+$/.test(candidate) ? candidate.toLowerCase() : candidate;
    const candidateBuffer = Buffer.from(normalizedCandidate);
    const expectedHexBuffer = Buffer.from(expectedHex);
    if (
      candidateBuffer.length === expectedHexBuffer.length &&
      crypto.timingSafeEqual(candidateBuffer, expectedHexBuffer)
    ) {
      return true;
    }

    const expectedBase64Buffer = Buffer.from(expectedBase64);
    if (
      candidateBuffer.length === expectedBase64Buffer.length &&
      crypto.timingSafeEqual(candidateBuffer, expectedBase64Buffer)
    ) {
      return true;
    }
  }

  return false;
}
