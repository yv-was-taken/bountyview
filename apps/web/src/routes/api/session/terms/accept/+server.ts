import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-guard';
import { acceptTerms } from '$lib/server/role';

const TERMS_VERSION = '2026-02-16';

export async function POST(event) {
  const user = await requireAuth(event);

  try {
    const accepted = await acceptTerms(user.id, TERMS_VERSION);

    if (!accepted) {
      return json({ ok: false, error: 'Failed to accept terms' }, { status: 500 });
    }

    return json({
      ok: true,
      termsAcceptedAt: accepted.termsAcceptedAt ?? null,
      termsVersion: accepted.termsVersion ?? TERMS_VERSION
    });
  } catch (err) {
    console.error('Terms acceptance failed', err);
    return json({ ok: false, error: 'Failed to accept terms' }, { status: 500 });
  }
}
