import { badRequest } from './http';

export async function readJson<T>(request: Request): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  try {
    const data = (await request.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, response: badRequest('Invalid JSON request body') };
  }
}

export function parseOptionalCommaList(value: string | null): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const entries = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return entries.length > 0 ? entries : undefined;
}
