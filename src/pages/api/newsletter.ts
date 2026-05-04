import type { APIRoute } from 'astro';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { logError } from '@/lib/logger';

export const prerender = false;

// POST /api/newsletter
// Body: JSON { email, source?, segment?, website? }
//
// Adds the email to a Brevo list. Segments :
//   - b2c (default) → BREVO_NEWSLETTER_LIST_ID_B2C, fallback BREVO_NEWSLETTER_LIST_ID
//   - b2b           → BREVO_NEWSLETTER_LIST_ID_B2B, fallback BREVO_NEWSLETTER_LIST_ID
//   - ecoles        → BREVO_NEWSLETTER_LIST_ID_ECOLES, fallback BREVO_NEWSLETTER_LIST_ID
//
// Le fallback unique permet de continuer à fonctionner avec une seule liste
// configurée au démarrage (rétro-compat V1) puis de splitter quand Élie
// crée les 3 listes Brevo distinctes. Sans aucun list ID configuré → 200
// silencieux (utile en dev local).
//
// Brevo handles double-opt-in (DOI) at template level — see doc.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BREVO_API = 'https://api.brevo.com/v3';

type Segment = 'b2c' | 'b2b' | 'ecoles';
const ALLOWED_SEGMENTS: readonly Segment[] = ['b2c', 'b2b', 'ecoles'];

function resolveListId(segment: Segment): number | null {
  const env = import.meta.env;
  const SEGMENT_ENV: Record<Segment, string | undefined> = {
    b2c: env.BREVO_NEWSLETTER_LIST_ID_B2C,
    b2b: env.BREVO_NEWSLETTER_LIST_ID_B2B,
    ecoles: env.BREVO_NEWSLETTER_LIST_ID_ECOLES,
  };
  const candidate = SEGMENT_ENV[segment] ?? env.BREVO_NEWSLETTER_LIST_ID;
  if (!candidate) return null;
  const parsed = Number.parseInt(candidate, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const POST: APIRoute = async ({ request }) => {
  const limited = rateLimit(request, RATE_LIMITS.newsletter);
  if (limited) return limited;

  let payload: { email?: string; source?: string; segment?: string; website?: string };
  try {
    payload = (await request.json()) as {
      email?: string;
      source?: string;
      segment?: string;
      website?: string;
    };
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

  // Defaults to 'b2c' when omitted / unknown — équivalent du comportement
  // V1 (une seule liste). Permet d'introduire le segment côté front sans
  // casser les anciens callers.
  const segment: Segment = ALLOWED_SEGMENTS.includes(payload.segment as Segment)
    ? (payload.segment as Segment)
    : 'b2c';

  const apiKey = import.meta.env.BREVO_API_KEY;
  const listId = resolveListId(segment);

  if (!apiKey || !listId) {
    // Mis-config = dev / staging without Brevo wired, OR ce segment précis
    // n'a pas encore de liste configurée. Don't reject the user — accept
    // the signup silently. Real env (Élie configure les 3 listes) will
    // succeed.
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
        attributes: {
          SOURCE_INSCRIPTION: payload.source ?? 'footer',
          // Permet de filtrer dans Brevo même quand 2 segments partagent
          // (transitoirement) la même liste de fallback.
          SEGMENT: segment.toUpperCase(),
        },
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
