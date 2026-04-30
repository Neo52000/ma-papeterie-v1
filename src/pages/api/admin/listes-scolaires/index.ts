import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-api';

export const prerender = false;

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const GET: APIRoute = async ({ request }) => {
  const gate = await requireAdmin(request);
  if (gate instanceof Response) return gate;

  const { data, error } = await supabaseServer
    .from('school_lists')
    .select('id, created_at, user_id, school_level, raw_text, matched_items')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return json(500, { error: error.message });
  return json(200, { items: data ?? [] });
};
