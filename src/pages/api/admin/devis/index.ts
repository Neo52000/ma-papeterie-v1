import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-api';

export const prerender = false;

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

// PostgREST .or() expects each value escaped — commas, parens, dots break the
// filter syntax. We strip those characters from user search input rather than
// trying to encode them, since company names / contacts / emails never contain
// them in a way the search would care about.
const sanitizeForOr = (input: string): string => input.replace(/[,()*]/g, '').trim();

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
  const search = sanitizeForOr(url.searchParams.get('q') ?? '');

  let query = supabaseServer
    .from('b2b_quotes')
    .select('id, created_at, company_name, contact_name, email, phone, message, status')
    .order('created_at', { ascending: false })
    .limit(200);
  if (status !== 'all') query = query.eq('status', status);

  if (search.length >= 2) {
    const pattern = `%${search}%`;
    query = query.or(
      [
        `company_name.ilike.${pattern}`,
        `contact_name.ilike.${pattern}`,
        `email.ilike.${pattern}`,
      ].join(','),
    );
  }

  const { data, error } = await query;
  if (error) return json(500, { error: error.message });
  return json(200, { items: data ?? [] });
};
