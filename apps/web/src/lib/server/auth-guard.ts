import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import type { AuthUser, UserRole } from '@bountyview/shared';

export async function requireAuth(event: RequestEvent): Promise<AuthUser> {
  const session = await event.locals.auth();
  const user = event.locals.currentUser;

  if (!session || !user) {
    error(401, 'Unauthorized');
  }

  return user;
}

export async function requireRole(event: RequestEvent, role: UserRole): Promise<AuthUser> {
  const user = await requireAuth(event);
  if (user.role !== role) {
    error(403, `Requires ${role} role`);
  }

  return user;
}
