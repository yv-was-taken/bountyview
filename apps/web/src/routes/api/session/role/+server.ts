import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAuth } from '$lib/server/auth-guard';
import { badRequest } from '$lib/server/http';
import { readJson } from '$lib/server/request';
import { setUserRole } from '$lib/server/role';

const schema = z.object({
  role: z.enum(['employer', 'candidate'])
});

export async function POST(event) {
  const user = await requireAuth(event);

  const body = await readJson<unknown>(event.request);
  if (!body.ok) {
    return body.response;
  }

  const parsed = schema.safeParse(body.data);
  if (!parsed.success) {
    return badRequest('Invalid role payload', parsed.error.flatten());
  }

  const updated = await setUserRole(user.id, parsed.data.role);

  return json({
    ok: true,
    role: updated?.role ?? parsed.data.role
  });
}
