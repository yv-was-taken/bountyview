import { redirect, type Handle } from '@sveltejs/kit';
import { handle as authHandle } from './auth';

const employerOnlyPrefixes = ['/bounties/new', '/templates'];

function isEmployerOnlyPath(pathname: string): boolean {
  if (employerOnlyPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  return /^\/bounties\/[^/]+\/submissions/.test(pathname);
}

function isCandidateOnlyPath(pathname: string): boolean {
  return /^\/bounties\/[^/]+\/submit/.test(pathname);
}

function isAuthenticatedOnlyPath(pathname: string): boolean {
  return pathname.startsWith('/dashboard') || pathname.startsWith('/wallet');
}

export const handle: Handle = async ({ event, resolve }) => {
  return authHandle({
    event,
    resolve: async (authEvent) => {
      const session = await authEvent.locals.auth();
      authEvent.locals.currentUser = session?.user
        ? {
            id: session.user.id,
            githubId: Number(session.user.githubId),
            githubUsername: session.user.githubUsername,
            role: session.user.role,
            companyId: session.user.companyId
          }
        : null;

      if (isAuthenticatedOnlyPath(authEvent.url.pathname) && !authEvent.locals.currentUser) {
        throw redirect(303, '/login');
      }

      if (isEmployerOnlyPath(authEvent.url.pathname) && authEvent.locals.currentUser?.role !== 'employer') {
        throw redirect(303, '/dashboard');
      }

      if (isCandidateOnlyPath(authEvent.url.pathname) && authEvent.locals.currentUser?.role !== 'candidate') {
        throw redirect(303, '/dashboard');
      }

      return resolve(authEvent);
    }
  });
};
