import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { logError } from '@/lib/logger';

export const prerender = false;

// POST /api/search/click — marks the product the user picked from a search
// result. Paired with /api/search/track which returns the row id.
//
// Update is gated on session_hash so a malicious client can't rewrite
// somebody else's row (the id is a UUID, but session_hash being on the
// same row removes the need to trust it alone).

interface ClickPayload {
  queryId: string;
  productId: string;
  position: number;
  sessionHash: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_POSITION = 100;

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const POST: APIRoute = async ({ request }) => {
  const limited = rateLimit(request, RATE_LIMITS.searchTrack);
  if (limited) return limited;

  let body: ClickPayload;
  try {
    body = (await request.json()) as ClickPayload;
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  if (!UUID_RE.test(body.queryId ?? '') || !UUID_RE.test(body.productId ?? '')) {
    return json(400, { error: 'invalid_id' });
  }
  if (
    typeof body.sessionHash !== 'string' ||
    body.sessionHash.length < 16 ||
    body.sessionHash.length > 64
  ) {
    return json(400, { error: 'invalid_session' });
  }
  const position = Number(body.position);
  if (!Number.isFinite(position) || position < 0 || position > MAX_POSITION) {
    return json(400, { error: 'invalid_position' });
  }

  try {
    const { error } = await supabaseServer
      .from('search_queries')
      .update({
        clicked_product_id: body.productId,
        clicked_position: Math.round(position),
      })
      .eq('id', body.queryId)
      .eq('session_hash', body.sessionHash);

    if (error) throw error;

    return json(200, { ok: true });
  } catch (err) {
    logError('search/click', 'update failed', err);
    return json(500, { error: 'internal' });
  }
};
