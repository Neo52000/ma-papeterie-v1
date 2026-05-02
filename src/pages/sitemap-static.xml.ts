import type { APIRoute } from 'astro';

export const prerender = false;

// Static pages sitemap — home, catalogue landing, B2B pages, legal.
// Product/category sitemaps are emitted separately (sitemap-products-N,
// sitemap-categories) and stitched together by sitemap-index.

const STATIC_ROUTES: ReadonlyArray<{ path: string; priority: string; changefreq: string }> = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/catalogue', priority: '0.9', changefreq: 'daily' },
  { path: '/blog', priority: '0.7', changefreq: 'weekly' },
  { path: '/tampon', priority: '0.6', changefreq: 'monthly' },
  { path: '/contact', priority: '0.7', changefreq: 'monthly' },
  { path: '/devis', priority: '0.7', changefreq: 'monthly' },
  { path: '/liste-scolaire', priority: '0.7', changefreq: 'monthly' },
  { path: '/livraison-retour', priority: '0.5', changefreq: 'yearly' },
  { path: '/mentions-legales', priority: '0.3', changefreq: 'yearly' },
  { path: '/cgv', priority: '0.3', changefreq: 'yearly' },
  { path: '/confidentialite', priority: '0.3', changefreq: 'yearly' },
  { path: '/cookies', priority: '0.3', changefreq: 'yearly' },
];

export const GET: APIRoute = async () => {
  const SITE_URL = import.meta.env.PUBLIC_SITE_URL;
  const now = new Date().toISOString();

  const urls = STATIC_ROUTES.map(
    (r) => `  <url>
    <loc>${SITE_URL}${r.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`,
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
};
