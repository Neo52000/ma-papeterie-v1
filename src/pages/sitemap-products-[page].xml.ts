import type { APIRoute } from 'astro';
import { fetchVendableProductsForSitemap } from '@/lib/queries';

export const prerender = false;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Sitemap with image extension — Google indexes product images for the
// Image search vertical. https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps
export const GET: APIRoute = async ({ params }) => {
  const SITE_URL = import.meta.env.PUBLIC_SITE_URL;
  const pageParam = Number.parseInt(params.page ?? '1', 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const entries = await fetchVendableProductsForSitemap(page);

  if (entries.length === 0) {
    return new Response('Not Found', { status: 404 });
  }

  const urls = entries
    .map((e) => {
      const productUrl = escapeXml(`${SITE_URL}/produit/${e.slug}`);
      const imageBlock = e.image_url
        ? `<image:image><image:loc>${escapeXml(e.image_url)}</image:loc></image:image>`
        : '';
      return `  <url><loc>${productUrl}</loc><lastmod>${e.updated_at}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority>${imageBlock}</url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
};
