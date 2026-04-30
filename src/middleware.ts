import { defineMiddleware } from 'astro:middleware';

// Netlify's [[headers]] in netlify.toml only apply to static files; SSR
// responses come back from Functions and bypass that allowlist. Without
// this middleware, prod was missing CSP / X-Frame-Options / Referrer-Policy
// / Permissions-Policy on every dynamic page — verified by curl on the
// home page on 2026-04-30 right before cutover.
//
// Keep the values in sync with netlify.toml so static + SSR responses
// stay coherent.

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://www.comlandi.fr https://cdn.shopify.com https://*.myshopify.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.myshopify.com https://*.supabase.co https://api.brevo.com https://*.ingest.de.sentry.io https://*.ingest.sentry.io",
  "frame-src 'self' https://*.myshopify.com",
  "form-action 'self' https://*.myshopify.com",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
].join('; ');

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': CSP,
};

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!response.headers.has(name)) {
      response.headers.set(name, value);
    }
  }
  return response;
});
