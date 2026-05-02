import type { APIRoute } from 'astro';
import { fetchPublishedPosts } from '@/lib/blog';
import { logError } from '@/lib/logger';

export const prerender = false;

// Blog sitemap — only published posts. Sourced from Supabase via the same
// query the public listing uses (RLS gates drafts even if the table grew
// past the limit). Empty <urlset> is fine — Google ignores empty sitemaps,
// and sitemap-index will keep referencing this URL so new posts surface
// without a code change.

export const GET: APIRoute = async () => {
  const SITE_URL = import.meta.env.PUBLIC_SITE_URL;

  let posts: Awaited<ReturnType<typeof fetchPublishedPosts>> = [];
  try {
    posts = await fetchPublishedPosts(1000);
  } catch (e) {
    // The blog table may not exist yet on a freshly-cloned env. Log and
    // emit an empty <urlset> so /sitemap-index.xml stays valid.
    logError('sitemap-blog', 'fetchPublishedPosts failed', e);
  }

  const urls = posts
    .map(
      (p) => `  <url>
    <loc>${SITE_URL}/blog/${p.slug}</loc>
    <lastmod>${p.published_at ?? new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`,
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
