// In-memory token-bucket-ish rate limiter for unauthenticated POST
// endpoints. Per-IP counter with a sliding window, intended as the cheap
// first layer of defense against curl loops, scrapers, and form-spammers.
//
// Scope of protection (what this catches):
//  - A single bot hammering /api/liste-scolaire/match (each call fans out
//    to 80 sequential FTS queries → easy to chew DB CPU).
//  - Form-spam on /api/demande-devis / /api/newsletter / /api/notify-stock
//    despite the existing honeypot (some bots fill nothing extra).
//  - Cost containment on /api/products/search-semantic + /api/liste-scolaire/ocr
//    which spend OpenAI tokens per call.
//
// Scope of NON-protection (deliberate):
//  - Distributed botnets — a per-IP map sees nothing useful when each
//    request comes from a unique IP. Mitigation = WAF / Cloudflare,
//    out of scope of V2.1.
//  - Cross-instance cohérence — Netlify Functions can spin up multiple
//    instances. A bot landing on N instances effectively gets N×limit.
//    Acceptable given our QPS profile (low) and the limits we set
//    (generous enough that legit users never trip them). Upstash counter
//    swap is a 1-file change here when this becomes real (V2.2 backlog).

export interface RateLimitConfig {
  /** Max calls per window per IP. */
  max: number;
  /** Window duration in milliseconds. */
  windowMs: number;
  /** Logical bucket name — different endpoints don't share quotas. */
  bucket: string;
}

interface BucketEntry {
  count: number;
  resetAt: number;
}

// One Map per process. Module-level so Astro's per-route handlers all
// share the same store within a Function instance.
const store = new Map<string, BucketEntry>();
const CLEANUP_EVERY = 1000;
let opsSinceCleanup = 0;

function purgeExpired(now: number): void {
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}

/**
 * Best-effort client IP extraction. Netlify's edge sets
 * `x-nf-client-connection-ip`; Cloudflare uses `cf-connecting-ip`; the
 * standard `x-forwarded-for` is the universal fallback (first hop = client).
 * Falls back to a synthetic key when no IP is available, which means an
 * unidentified attacker still gets rate-limited (just bucketed together).
 */
export function extractClientIp(request: Request): string {
  const headers = request.headers;
  const candidates = [
    headers.get('x-nf-client-connection-ip'),
    headers.get('cf-connecting-ip'),
    headers.get('x-real-ip'),
    headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
  ];
  for (const c of candidates) {
    if (c && c.length > 0 && c.length < 64) return c;
  }
  return 'unknown';
}

/**
 * Returns null when the request is allowed (caller proceeds), or a 429
 * Response ready to send back. The 429 includes Retry-After in seconds
 * so clients (and search-engine bots) can back off correctly.
 */
export function rateLimit(request: Request, config: RateLimitConfig): Response | null {
  const ip = extractClientIp(request);
  const key = `${config.bucket}:${ip}`;
  const now = Date.now();

  // Lazy cleanup — every N ops we sweep expired entries so the map can't
  // grow unbounded if many distinct IPs hit a noisy endpoint.
  if (++opsSinceCleanup >= CLEANUP_EVERY) {
    opsSinceCleanup = 0;
    purgeExpired(now);
  }

  const entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return null;
  }

  if (entry.count < config.max) {
    entry.count++;
    return null;
  }

  const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  return new Response(JSON.stringify({ error: 'rate_limited', retryAfterSec }), {
    status: 429,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'retry-after': String(retryAfterSec),
    },
  });
}

// Pre-tuned configs for the public endpoints. All windows are 1 minute —
// the limits are picked from observed legit traffic + a safety multiplier.
export const RATE_LIMITS = {
  // 80 sequential FTS queries per call → very expensive. Even a focused
  // power user pasting / re-pasting their list lands well under 5/min.
  listeScolaireMatch: { bucket: 'liste-match', max: 5, windowMs: 60_000 },
  // Paid OpenAI Vision call. 5/min/IP = ~$0.0005/min worst case.
  listeScolaireOcr: { bucket: 'liste-ocr', max: 5, windowMs: 60_000 },
  // Paid embedding call. 30/min/IP keeps power users fine, blocks loops.
  semanticSearch: { bucket: 'semantic', max: 30, windowMs: 60_000 },
  // Form posts — humans rarely re-submit. 5 attempts gives enough room
  // for a typo + retry without exposing us to spammers.
  formSubmit: { bucket: 'form', max: 5, windowMs: 60_000 },
  // Newsletter: same envelope as forms — don't accept signup floods.
  newsletter: { bucket: 'newsletter', max: 5, windowMs: 60_000 },
  // Search Intelligence track endpoint — autocomplete debounce can fire
  // ~4 calls/sec at peak human typing speed, capped at 60/min/IP.
  searchTrack: { bucket: 'search-track', max: 60, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitConfig>;
