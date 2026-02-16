import { eq } from 'drizzle-orm';
import { db, users } from '@bountyview/db';

export async function setUserRole(userId: string, role: 'employer' | 'candidate') {
  const updated = await db
    .update(users)
    .set({
      role,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      role: users.role
    });

  return updated[0] ?? null;
}
