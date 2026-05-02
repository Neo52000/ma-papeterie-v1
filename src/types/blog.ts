// Blog post shape — mirrors supabase/migrations/20260502150000_blog_posts.sql.
// Until the migration is applied in prod and `npm run gen:types` is rerun, the
// generated Database type doesn't carry blog_posts; queries cast through this
// type. Remove the cast in src/lib/blog.ts once types are regenerated.

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content_md: string;
  cover_image_url: string | null;
  published_at: string | null;
  ai_generated: boolean;
  ai_prompt: string | null;
  author: string;
  reading_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export type BlogPostListItem = Pick<
  BlogPost,
  | 'id'
  | 'slug'
  | 'title'
  | 'excerpt'
  | 'cover_image_url'
  | 'published_at'
  | 'reading_minutes'
  | 'author'
>;
