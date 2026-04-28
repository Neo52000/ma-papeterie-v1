import type { APIRoute } from 'astro';
import { SITEMAP_PRODUCTS_PER_PAGE, countVendableProducts } from '@/lib/queries';

export const prerender = false;

export const GET: APIRoute = async () => {
  const SITE_URL = import.meta.env.PUBLIC_SITE_URL;
  const total = await countVendableProducts();
  const productPages = Math.max(1, Math.ceil(total / SITEMAP_PRODUCTS_PER_PAGE));
  const now = new Date().toISOString();

  const sitemaps = [
    `${SITE_URL}/sitemap-static.xml`,
    `${SITE_URL}/sitemap-categories.xml`,
    ...Array.from({ length: productPages }, (_, i) => `${SITE_URL}/sitemap-products-${i + 1}.xml`),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map((loc) => `  <sitemap><loc>${loc}</loc><lastmod>${now}</lastmod></sitemap>`).join('\n')}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
};
