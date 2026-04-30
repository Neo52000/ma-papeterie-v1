import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-api';

export const prerender = false;

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const GET: APIRoute = async ({ request, url }) => {
  const gate = await requireAdmin(request);
  if (gate instanceof Response) return gate;

  const allowed = ['pending', 'in_progress', 'answered', 'archived'] as const;
  type Status = (typeof allowed)[number];
  const rawStatus = url.searchParams.get('status') ?? 'pending';
  const status: Status | 'all' = allowed.includes(rawStatus as Status)
    ? (rawStatus as Status)
    : rawStatus === 'all'
      ? 'all'
      : 'pending';

  let query = supabaseServer
    .from('b2b_quotes')
    .select('id, created_at, company_name, contact_name, email, phone, message, status')
    .order('created_at', { ascending: false })
    .limit(200);
  if (status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return json(500, { error: error.message });
  return json(200, { items: data ?? [] });
};
