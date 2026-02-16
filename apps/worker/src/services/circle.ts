import { env } from '../env';

export async function getTransferStatus(transferId: string): Promise<string> {
  const res = await fetch(`https://api-sandbox.circle.com/v1/transfers/${transferId}`, {
    headers: {
      Authorization: `Bearer ${env.CIRCLE_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Circle status fetch failed: ${res.status} ${body}`);
  }

  const payload = (await res.json()) as {
    data: {
      status: string;
    };
  };

  return payload.data.status;
}
