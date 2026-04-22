import type { APIRoute } from 'astro';
import { fetchSitemapCategories } from '@/lib/queries';

export const prerender = false;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const SITE_URL = import.meta.env.PUBLIC_SITE_URL;
  const entries = await fetchSitemapCategories();

  const urls = entries
    .map(
      (e) =>
        `  <url><loc>${escapeXml(`${SITE_URL}/catalogue/${e.slug}`)}</loc><lastmod>${e.updated_at}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
    )
    .join('\n');

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
