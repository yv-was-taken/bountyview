import { eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { db, users } from '@bountyview/db';

export async function PUT(event) {
  const currentUser = event.locals.currentUser;
  if (!currentUser) {
    return json({ ok: false }, { status: 401 });
  }

  const body = await event.request.json();
  const enabled = Boolean(body.emailNotifications);

  await db.update(users).set({ emailNotifications: enabled }).where(eq(users.id, currentUser.id));

  return json({ ok: true, emailNotifications: enabled });
}
