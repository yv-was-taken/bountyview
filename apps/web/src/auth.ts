import { SvelteKitAuth } from '@auth/sveltekit';
import GitHub from '@auth/sveltekit/providers/github';
import { and, eq } from 'drizzle-orm';
import { db, users } from '@bountyview/db';
import { getEnv } from '$lib/server/env';

const env = getEnv();

export const { handle, signIn, signOut } = SvelteKitAuth({
  trustHost: true,
  secret: env.SESSION_SECRET,
  providers: [
    GitHub({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'read:user user:email repo'
        }
      }
    })
  ],
  callbacks: {
    async signIn({ profile }) {
      const githubId = String(profile?.id ?? '');
      const username = (profile as Record<string, unknown> | undefined)?.login;

      if (!githubId || typeof username !== 'string') {
        return false;
      }

      const existing = await db.query.users.findFirst({ where: eq(users.githubId, githubId) });
      if (!existing) {
        await db.insert(users).values({
          githubId,
          githubUsername: username,
          avatarUrl: typeof profile?.image === 'string' ? profile.image : null,
          role: 'candidate'
        });
      }

      return true;
    },
    async jwt({ token, profile }) {
      const githubId = profile?.id ? String(profile.id) : typeof token.githubId === 'string' ? token.githubId : null;

      if (githubId) {
        const dbUser = await db.query.users.findFirst({ where: eq(users.githubId, githubId) });

        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
          token.githubId = dbUser.githubId;
          token.githubUsername = dbUser.githubUsername;
          token.companyId = dbUser.companyId;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (!session.user) {
        session.user = {
          id: '',
          role: 'candidate',
          githubId: '',
          githubUsername: '',
          companyId: null
        };
      }

      session.user.id = typeof token.userId === 'string' ? token.userId : '';
      session.user.role = typeof token.role === 'string' ? token.role : 'candidate';
      session.user.githubId = typeof token.githubId === 'string' ? token.githubId : '';
      session.user.githubUsername = typeof token.githubUsername === 'string' ? token.githubUsername : '';
      session.user.companyId = typeof token.companyId === 'string' ? token.companyId : null;

      if (!session.user.id || !session.user.githubId) {
        const fallback = await db.query.users.findFirst({
          where: and(
            eq(users.githubId, String(token.githubId ?? '')),
            eq(users.githubUsername, String(token.githubUsername ?? ''))
          )
        });

        if (fallback) {
          session.user.id = fallback.id;
          session.user.role = fallback.role;
          session.user.githubId = fallback.githubId;
          session.user.githubUsername = fallback.githubUsername;
          session.user.companyId = fallback.companyId;
        }
      }

      return session;
    }
  }
});
