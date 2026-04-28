import type { APIRoute } from 'astro';

export const prerender = false;

// Robots.txt served dynamically so that the Sitemap URL always uses the
// current PUBLIC_SITE_URL — no manual edit needed at the D+16 cutover when
// the env var flips from netlify.app → ma-papeterie.fr.
export const GET: APIRoute = async () => {
  const SITE_URL = import.meta.env.PUBLIC_SITE_URL;

  const body = `User-agent: *
Allow: /

Disallow: /api/
Disallow: /compte
Disallow: /connexion
Disallow: /inscription
Disallow: /merci

Sitemap: ${SITE_URL}/sitemap-index.xml
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
};
