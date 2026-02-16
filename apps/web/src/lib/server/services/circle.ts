import { getEnv } from '../env';

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
  amountUsdc: number;
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
      amount: params.amountUsdc.toFixed(2),
      currency: 'USD'
    },
    source: {
      type: 'wallet'
    },
    toAmount: {
      currency: params.destinationCurrency,
      amount: params.amountUsdc.toFixed(2)
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
  const expected = env.CIRCLE_WEBHOOK_SECRET;
  return signature === expected && body.length > 0;
}
