import type { APIRoute } from 'astro';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { logError } from '@/lib/logger';

export const prerender = false;

// POST /api/newsletter
// Body: JSON { email, source?, website? }
// Adds the email to the Brevo list configured via BREVO_NEWSLETTER_LIST_ID.
// Brevo handles double-opt-in (DOI) at template level — see doc.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BREVO_API = 'https://api.brevo.com/v3';

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const POST: APIRoute = async ({ request }) => {
  const limited = rateLimit(request, RATE_LIMITS.newsletter);
  if (limited) return limited;

  let payload: { email?: string; source?: string; website?: string };
  try {
    payload = (await request.json()) as { email?: string; source?: string; website?: string };
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  // Honeypot — bots fill every field including hidden ones.
  if (payload.website && payload.website.trim().length > 0) {
    return json(200, { ok: true });
  }

  const email = payload.email?.trim().toLowerCase() ?? '';
  if (!EMAIL_REGEX.test(email)) {
    return json(400, { error: 'Email invalide' });
  }

  const apiKey = import.meta.env.BREVO_API_KEY;
  const listIdRaw = import.meta.env.BREVO_NEWSLETTER_LIST_ID;
  const listId = listIdRaw ? Number.parseInt(listIdRaw, 10) : null;

  if (!apiKey || !listId || !Number.isFinite(listId)) {
    // Mis-config = dev / staging without Brevo wired. Don't reject the
    // user — accept the signup silently. Real env will succeed.
    return json(200, { ok: true });
  }

  try {
    const res = await fetch(`${BREVO_API}/contacts`, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        listIds: [listId],
        attributes: { SOURCE_INSCRIPTION: payload.source ?? 'footer' },
        updateEnabled: true,
      }),
    });

    if (!res.ok && res.status !== 400) {
      // 400 includes the case where the contact is already in the list with
      // updateEnabled — Brevo returns 204 normally. Anything else is a fail.
      const body = await res.text();
      throw new Error(`Brevo ${res.status}: ${body}`);
    }
    return json(200, { ok: true });
  } catch (err) {
    logError('newsletter', 'Brevo subscribe failed', err);
    return json(500, { error: 'Erreur interne' });
  }
};
