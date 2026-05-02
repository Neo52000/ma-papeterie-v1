import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/admin-api';
import { blogPostsTable, estimateReadingMinutes } from '@/lib/blog';
import type { BlogPost } from '@/types/blog';

export const prerender = false;

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

export const GET: APIRoute = async ({ request, params }) => {
  const gate = await requireAdmin(request);
  if (gate instanceof Response) return gate;
  const id = params.id;
  if (!id) return json(400, { error: 'missing_id' });

  const { data, error } = await blogPostsTable()
    .select('*')
    .eq('id', id)
    .maybeSingle()
    .returns<BlogPost | null>();
  if (error) return json(500, { error: error.message });
  if (!data) return json(404, { error: 'not_found' });
  return json(200, { post: data });
};

interface PatchBody {
  title?: unknown;
  slug?: unknown;
  excerpt?: unknown;
  content_md?: unknown;
  cover_image_url?: unknown;
  author?: unknown;
  publish?: unknown; // true → publish (sets published_at=now if currently null), false → unpublish
}

export const PATCH: APIRoute = async ({ request, params }) => {
  const gate = await requireAdmin(request);
  if (gate instanceof Response) return gate;
  const id = params.id;
  if (!id) return json(400, { error: 'missing_id' });

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.title === 'string' && body.title.length <= 200) update.title = body.title;
  if (typeof body.slug === 'string' && SLUG_RE.test(body.slug))
    update.slug = body.slug.slice(0, 80);
  if (typeof body.excerpt === 'string' && body.excerpt.length <= 500) update.excerpt = body.excerpt;
  if (typeof body.content_md === 'string' && body.content_md.length <= 50_000) {
    update.content_md = body.content_md;
    update.reading_minutes = estimateReadingMinutes(body.content_md);
  }
  if (body.cover_image_url == null || body.cover_image_url === '') {
    if ('cover_image_url' in body) update.cover_image_url = null;
  } else if (typeof body.cover_image_url === 'string' && body.cover_image_url.length <= 500) {
    update.cover_image_url = body.cover_image_url;
  }
  if (typeof body.author === 'string' && body.author.length <= 100) update.author = body.author;

  if (body.publish === true) {
    // Publishing a draft sets the timestamp to now; republishing an already
    // -published post keeps the original date so the canonical publication
    // date doesn't drift on every save.
    const { data: existing } = await blogPostsTable()
      .select('published_at')
      .eq('id', id)
      .maybeSingle()
      .returns<{ published_at: string | null } | null>();
    if (existing?.published_at == null) update.published_at = new Date().toISOString();
  } else if (body.publish === false) {
    update.published_at = null;
  }

  if (Object.keys(update).length === 0) return json(400, { error: 'nothing_to_update' });

  const { data, error } = await blogPostsTable()
    .update(update as never)
    .eq('id', id)
    .select('*')
    .single()
    .returns<BlogPost>();
  if (error) {
    if (error.code === '23505') return json(409, { error: 'slug_already_exists' });
    return json(500, { error: error.message });
  }
  return json(200, { post: data });
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const gate = await requireAdmin(request);
  if (gate instanceof Response) return gate;
  const id = params.id;
  if (!id) return json(400, { error: 'missing_id' });

  const { error } = await blogPostsTable().delete().eq('id', id);
  if (error) return json(500, { error: error.message });
  return json(200, { ok: true });
};
