import { json } from '@sveltejs/kit';

export async function GET(event) {
  const session = await event.locals.auth();

  return json({
    session,
    user: event.locals.currentUser
  });
}
