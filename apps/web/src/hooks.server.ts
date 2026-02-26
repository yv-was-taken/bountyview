import { json, redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { handle as authHandle } from './auth';
import { checkRateLimit, RATE_LIMITS } from '$lib/server/rate-limit';

// ---------------------------------------------------------------------------
// Route classification helpers
// ---------------------------------------------------------------------------

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

function isTermsBypassPath(pathname: string): boolean {
  if (pathname.startsWith('/terms')) {
    return true;
  }

  if (pathname === '/login' || pathname === '/signout') {
    return true;
  }

  if (pathname.startsWith('/auth')) {
    return true;
  }

  if (pathname.startsWith('/api/session/terms/accept')) {
    return true;
  }

  if (pathname.startsWith('/api/session')) {
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Rate-limit bucket classification
// ---------------------------------------------------------------------------

function getRateLimitBucket(pathname: string): { bucket: string; config: (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS] } | null {
  if (pathname.startsWith('/auth')) {
    return { bucket: 'auth', config: RATE_LIMITS.auth };
  }

  if (pathname.startsWith('/api/session')) {
    return { bucket: 'auth', config: RATE_LIMITS.auth };
  }

  if (pathname.startsWith('/api/webhooks')) {
    return { bucket: 'webhooks', config: RATE_LIMITS.api };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Hook 1: Rate limiting — runs before auth to reject early
// ---------------------------------------------------------------------------

const handleRateLimit: Handle = async ({ event, resolve }) => {
  const limit = getRateLimitBucket(event.url.pathname);

  if (limit) {
    const ip = event.getClientAddress();
    const result = checkRateLimit(ip, limit.bucket, limit.config);

    if (!result.allowed) {
      return json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(result.retryAfterSeconds)
          }
        }
      );
    }
  }

  return resolve(event);
};

// ---------------------------------------------------------------------------
// Hook 2: Auth + route guards (existing logic, unchanged)
// ---------------------------------------------------------------------------

const handleAuth: Handle = async ({ event, resolve }) => {
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
            companyId: session.user.companyId,
            termsAcceptedAt: session.user.termsAcceptedAt ?? null
          }
        : null;

      if (authEvent.locals.currentUser && !isTermsBypassPath(authEvent.url.pathname)) {
        if (!authEvent.locals.currentUser.termsAcceptedAt) {
          throw redirect(303, '/terms');
        }
      }

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

// ---------------------------------------------------------------------------
// Hook 3: Security response headers
// ---------------------------------------------------------------------------

const handleSecurityHeaders: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
};

// ---------------------------------------------------------------------------
// Compose all hooks in order
// ---------------------------------------------------------------------------

export const handle = sequence(handleRateLimit, handleAuth, handleSecurityHeaders);
