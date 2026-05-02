import { marked } from 'marked';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/types/database';
import type { BlogPost, BlogPostListItem } from '@/types/blog';

// Until `npm run gen:types` runs after the migration in
// 20260502150000_blog_posts.sql, blog_posts is absent from the generated
// Database type. We extend Database locally with the table shape and re-cast
// supabaseServer to the extended client. Drop both the type extension and
// the cast once the types are regenerated.
type BlogDatabase = Database & {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & {
      blog_posts: {
        Row: BlogPost;
        Insert: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<BlogPost>;
        Relationships: [];
      };
    };
  };
};

const supa = supabaseServer as unknown as SupabaseClient<BlogDatabase>;

export const blogPostsTable = () => supa.from('blog_posts');

// Slugify French strings: lowercase, strip accents, keep [a-z0-9-], collapse
// dashes. Used both when admins create a post (slug auto-suggested) and when
// the AI draft endpoint produces a title → slug.
export const slugify = (input: string): string =>
  input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

// ~225 wpm is the conservative end of "average French reading speed"
// referenced by Medium / Reedsy. Round up so 1-paragraph posts still get a
// "1 min" badge instead of "0 min".
export const estimateReadingMinutes = (markdown: string): number => {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 225));
};

// Render markdown to HTML server-side. Posts are admin-authored only so we
// trust the source — no DOMPurify needed. marked.parse is sync when given a
// string (the async overload is for hooks).
export const renderMarkdown = (markdown: string): string =>
  marked.parse(markdown, { async: false }) as string;

const LIST_COLUMNS =
  'id, slug, title, excerpt, cover_image_url, published_at, reading_minutes, author';

// Public list — only published posts, newest first.
export async function fetchPublishedPosts(limit = 20): Promise<BlogPostListItem[]> {
  const { data, error } = await blogPostsTable()
    .select(LIST_COLUMNS)
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(limit)
    .returns<BlogPostListItem[]>();
  if (error) throw new Error(`fetchPublishedPosts: ${error.message}`);
  return data ?? [];
}

export async function fetchPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await blogPostsTable()
    .select('*')
    .eq('slug', slug)
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .maybeSingle()
    .returns<BlogPost | null>();
  if (error) throw new Error(`fetchPublishedPostBySlug: ${error.message}`);
  return data;
}
