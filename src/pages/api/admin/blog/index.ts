import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/admin-api';
import { blogPostsTable, estimateReadingMinutes, slugify } from '@/lib/blog';
import type { BlogPost } from '@/types/blog';

export const prerender = false;

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const TITLE_MAX = 200;
const EXCERPT_MAX = 500;
const CONTENT_MAX = 50_000;

interface CreateBody {
  title?: unknown;
  slug?: unknown;
  excerpt?: unknown;
  content_md?: unknown;
  cover_image_url?: unknown;
  author?: unknown;
  ai_generated?: unknown;
  ai_prompt?: unknown;
  publish?: unknown;
}

const validateString = (
  value: unknown,
  field: string,
  max: number,
  required: boolean,
): string | { error: string } => {
  if (value == null || value === '') {
    if (required) return { error: `${field} required` };
    return '';
  }
  if (typeof value !== 'string') return { error: `${field} must be string` };
  if (value.length > max) return { error: `${field} too long (max ${max})` };
  return value;
};

export const GET: APIRoute = async ({ request, url }) => {
  const gate = await requireAdmin(request);
  if (gate instanceof Response) return gate;

  // Admins see ALL posts (drafts + published). Public list is gated by RLS
  // on the public-readable policy.
  const status = url.searchParams.get('status') ?? 'all'; // 'all' | 'draft' | 'published'

  let query = blogPostsTable()
    .select(
      'id, slug, title, excerpt, cover_image_url, published_at, author, reading_minutes, ai_generated, created_at, updated_at',
    )
    .order('updated_at', { ascending: false })
    .limit(200);

  if (status === 'draft') query = query.is('published_at', null);
  else if (status === 'published') query = query.not('published_at', 'is', null);

  const { data, error } = await query;
  if (error) return json(500, { error: error.message });
  return json(200, { items: data ?? [] });
};

export const POST: APIRoute = async ({ request }) => {
  const gate = await requireAdmin(request);
  if (gate instanceof Response) return gate;

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const title = validateString(body.title, 'title', TITLE_MAX, true);
  if (typeof title !== 'string') return json(400, title);

  const excerpt = validateString(body.excerpt, 'excerpt', EXCERPT_MAX, false);
  if (typeof excerpt !== 'string') return json(400, excerpt);

  const content_md = validateString(body.content_md, 'content_md', CONTENT_MAX, false);
  if (typeof content_md !== 'string') return json(400, content_md);

  const cover_image_url = validateString(body.cover_image_url, 'cover_image_url', 500, false);
  if (typeof cover_image_url !== 'string') return json(400, cover_image_url);

  const author = validateString(body.author, 'author', 100, false);
  if (typeof author !== 'string') return json(400, author);

  // Slug: explicit if valid, else auto from title.
  let slug = typeof body.slug === 'string' && SLUG_RE.test(body.slug) ? body.slug.slice(0, 80) : '';
  if (!slug) slug = slugify(title);
  if (!slug) return json(400, { error: 'slug_unresolvable' });

  const reading_minutes = content_md ? estimateReadingMinutes(content_md) : null;
  const publish = body.publish === true;
  const published_at = publish ? new Date().toISOString() : null;

  const ai_generated = body.ai_generated === true;
  const ai_prompt =
    typeof body.ai_prompt === 'string' && body.ai_prompt.length <= 2000 ? body.ai_prompt : null;

  const insert = {
    slug,
    title,
    excerpt,
    content_md,
    cover_image_url: cover_image_url || null,
    author: author || 'Reine & Fils',
    published_at,
    ai_generated,
    ai_prompt,
    reading_minutes,
  };

  const { data, error } = await blogPostsTable()
    .insert(insert as never)
    .select('*')
    .single()
    .returns<BlogPost>();

  if (error) {
    if (error.code === '23505') return json(409, { error: 'slug_already_exists' });
    return json(500, { error: error.message });
  }

  return json(201, { post: data });
};
