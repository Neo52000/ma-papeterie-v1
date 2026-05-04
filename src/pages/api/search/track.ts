import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { logError } from '@/lib/logger';

export const prerender = false;

// POST /api/search/track — Search Intelligence capture endpoint.
//
// Anonymous: payload contains a session-hash generated client-side in
// sessionStorage (purged on tab close). No IP, no email, no Auth header.
// See migration 20260504120000_search_intelligence.sql for the RGPD note.
//
// Returns { id } so the client can call /api/search/click later to mark
// which product the user picked from the results (powers v_search_low_ctr).

interface TrackPayload {
  query: string;
  resultsCount: number;
  source: 'search_bar' | 'autocomplete' | 'category_filter' | 'url_param';
  sessionHash: string;
  device?: 'mobile' | 'desktop' | 'tablet';
  isB2b?: boolean;
}

const ALLOWED_SOURCES = new Set(['search_bar', 'autocomplete', 'category_filter', 'url_param']);
const ALLOWED_DEVICES = new Set(['mobile', 'desktop', 'tablet']);

const MAX_QUERY_LEN = 200;
const MIN_SESSION_LEN = 16;
const MAX_SESSION_LEN = 64;
const MAX_RESULTS_COUNT = 9999;

function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return /bot|crawl|spider|scraper|facebookexternalhit|preview|monitor|lighthouse/i.test(userAgent);
}

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const POST: APIRoute = async ({ request }) => {
  if (isBot(request.headers.get('user-agent'))) {
    return json(200, { skipped: 'bot' });
  }

  // IP-based rate limit (shared lib). The session_hash payload check is
  // not a substitute — a malicious client can rotate sessionStorage between
  // calls.
  const limited = rateLimit(request, RATE_LIMITS.searchTrack);
  if (limited) return limited;

  let body: TrackPayload;
  try {
    body = (await request.json()) as TrackPayload;
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  // Strict validation — zero trust on the client payload.
  if (!body.query || typeof body.query !== 'string' || body.query.length === 0) {
    return json(400, { error: 'invalid_query' });
  }
  if (body.query.length > MAX_QUERY_LEN) {
    return json(400, { error: 'query_too_long' });
  }
  if (!ALLOWED_SOURCES.has(body.source)) {
    return json(400, { error: 'invalid_source' });
  }
  if (
    typeof body.sessionHash !== 'string' ||
    body.sessionHash.length < MIN_SESSION_LEN ||
    body.sessionHash.length > MAX_SESSION_LEN ||
    !/^[a-f0-9]+$/i.test(body.sessionHash)
  ) {
    return json(400, { error: 'invalid_session' });
  }
  if (body.device !== undefined && !ALLOWED_DEVICES.has(body.device)) {
    return json(400, { error: 'invalid_device' });
  }

  const resultsCount = Math.max(0, Math.min(MAX_RESULTS_COUNT, Number(body.resultsCount) || 0));

  try {
    const normRes = await supabaseServer.rpc('normalize_query', { input: body.query });
    if (normRes.error) throw normRes.error;
    const queryNorm = (normRes.data as string | null) ?? body.query.toLowerCase();

    const insertRes = await supabaseServer
      .from('search_queries')
      .insert({
        query_raw: body.query.slice(0, MAX_QUERY_LEN),
        query_norm: queryNorm,
        results_count: resultsCount,
        source: body.source,
        session_hash: body.sessionHash,
        device: body.device ?? null,
        is_b2b: body.isB2b === true,
      })
      .select('id')
      .single();

    if (insertRes.error) throw insertRes.error;

    return json(200, { id: insertRes.data.id });
  } catch (err) {
    logError('search/track', 'insert failed', err);
    return json(500, { error: 'internal' });
  }
};
