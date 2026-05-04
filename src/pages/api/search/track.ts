import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
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

// In-memory rate limit per session_hash. 30 inserts/min is generous for
// debounced autocomplete (worst case ~1 req/250ms = 240/min, capped here
// to keep noisy clients in check). Map is per-instance — fine for low
// QPS, swap to Upstash counter when this becomes a real concern (V2.2
// "Rate limiting" item in BACKLOG-V2.md).
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;
const rateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimit.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count++;
  return true;
}

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

  if (!checkRateLimit(body.sessionHash)) {
    return json(429, { error: 'rate_limited' });
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
