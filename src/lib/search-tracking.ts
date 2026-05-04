// Client-side helper for the Search Intelligence capture endpoints
// (/api/search/track + /api/search/click). Used by the header autocomplete
// React island and by a tiny inline script on the catalogue SSR page.
//
// Storage choice: sessionStorage (cleared on tab close), not localStorage.
// This keeps us inside the CNIL "anonymous internal stats" exemption that
// doesn't require a consent banner. localStorage with rotation would be
// stricter analytics → would force a banner before V2.2 ships one. See the
// migration header for the full rationale.

const SESSION_KEY = 'mapap-msi-session';
const SESSION_LEN = 32;

let cachedHash: string | null = null;

const isBrowser = (): boolean => typeof window !== 'undefined' && typeof crypto !== 'undefined';

function genHash(): string {
  // 16 random bytes → 32 hex chars. Matches the [a-f0-9]+ check on the
  // server (track.ts) and satisfies the 16-64 length window.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

function getSessionHash(): string | null {
  if (!isBrowser()) return null;
  if (cachedHash) return cachedHash;
  try {
    const stored = window.sessionStorage.getItem(SESSION_KEY);
    if (stored && stored.length === SESSION_LEN && /^[a-f0-9]+$/.test(stored)) {
      cachedHash = stored;
      return stored;
    }
  } catch {
    /* sessionStorage unavailable (private mode, locked down) — give up */
    return null;
  }
  const fresh = genHash();
  try {
    window.sessionStorage.setItem(SESSION_KEY, fresh);
  } catch {
    /* still usable for this page load even without persistence */
  }
  cachedHash = fresh;
  return fresh;
}

function detectDevice(): 'mobile' | 'desktop' | 'tablet' {
  if (!isBrowser()) return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad/.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod/.test(ua)) return 'mobile';
  return 'desktop';
}

// Per-page in-memory dedup so identical (query, source) calls fired within
// 3s of each other (debounce edges, double-submit, hot reload) don't bloat
// the table. Server-side rate limit is the second line.
const lastTrack = new Map<string, number>();
const DEDUP_WINDOW_MS = 3000;

export interface TrackArgs {
  query: string;
  resultsCount: number;
  source: 'search_bar' | 'autocomplete' | 'category_filter' | 'url_param';
  isB2b?: boolean;
}

export interface TrackResult {
  id: string | null;
}

export async function trackSearch(args: TrackArgs): Promise<TrackResult> {
  if (!isBrowser()) return { id: null };
  const trimmed = args.query.trim();
  if (trimmed.length < 2) return { id: null };

  const sessionHash = getSessionHash();
  if (!sessionHash) return { id: null };

  const dedupKey = `${trimmed}|${args.source}`;
  const now = Date.now();
  const previous = lastTrack.get(dedupKey);
  if (previous && now - previous < DEDUP_WINDOW_MS) return { id: null };
  lastTrack.set(dedupKey, now);

  try {
    const res = await fetch('/api/search/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: trimmed,
        resultsCount: args.resultsCount,
        source: args.source,
        sessionHash,
        device: detectDevice(),
        isB2b: args.isB2b === true,
      }),
      keepalive: true,
    });
    if (!res.ok) return { id: null };
    const json = (await res.json()) as { id?: string };
    return { id: json.id ?? null };
  } catch {
    // Tracking must never block UX. Swallow.
    return { id: null };
  }
}

export interface ClickArgs {
  queryId: string;
  productId: string;
  position: number;
}

export async function trackClick(args: ClickArgs): Promise<void> {
  if (!isBrowser()) return;
  const sessionHash = getSessionHash();
  if (!sessionHash) return;
  try {
    await fetch('/api/search/click', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...args, sessionHash }),
      keepalive: true,
    });
  } catch {
    /* non-blocking */
  }
}
