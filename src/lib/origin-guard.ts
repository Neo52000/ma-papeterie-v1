// Lightweight CSRF / scraping mitigation for unauthenticated public POST
// endpoints that hit paid third parties (OpenAI, Brevo) or do expensive
// work (pgvector + N FTS queries). The browser always sends an Origin
// header on cross-origin and same-origin POST/PUT/DELETE; curl, scrapers,
// and most bots either omit it or send a value we don't allowlist.
//
// This is NOT a substitute for real auth or rate-limiting (V2.1 backlog),
// it's the cheapest layer of defense that filters trivial abuse without
// breaking anonymous flows we want to keep open (school list OCR, school
// list matching, semantic search).

const STAGING_HOST = 'ma-papeterie-v1.netlify.app';

function allowedOrigins(): string[] {
  // Production prefers PUBLIC_SITE_URL; staging falls back to the Netlify
  // subdomain so smoke testing on a deploy preview keeps working.
  const site = (import.meta.env.PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
  const out = new Set<string>();
  if (site) out.add(site);
  out.add(`https://${STAGING_HOST}`);
  out.add(`http://${STAGING_HOST}`);
  return Array.from(out);
}

/**
 * Returns true iff the request's Origin header matches one of our known
 * domains. Returns false for missing Origin, curl-style requests, and
 * cross-site requests from anywhere that's not us.
 */
export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  return allowedOrigins().includes(origin);
}
