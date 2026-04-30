import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-api';
import { logError } from '@/lib/logger';

export const prerender = false;

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

type Status = 'pending' | 'in_progress' | 'answered' | 'archived';
const ALLOWED_STATUSES: Set<Status> = new Set(['pending', 'in_progress', 'answered', 'archived']);

export const GET: APIRoute = async ({ request, params }) => {
  const gate = await requireAdmin(request);
  if (gate instanceof Response) return gate;

  const id = params.id;
  if (!id) return json(400, { error: 'Missing id' });

  const { data, error } = await supabaseServer
    .from('b2b_quotes')
    .select(
      'id, created_at, updated_at, company_name, siret, contact_name, email, phone, message, attachment_url, status, source',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) return json(500, { error: error.message });
  if (!data) return json(404, { error: 'Not found' });
  return json(200, { quote: data });
};

export const PATCH: APIRoute = async ({ request, params }) => {
  const gate = await requireAdmin(request);
  if (gate instanceof Response) return gate;

  const id = params.id;
  if (!id) return json(400, { error: 'Missing id' });

  let payload: { status?: string };
  try {
    payload = (await request.json()) as { status?: string };
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }
  const candidate = payload.status ?? '';
  if (!ALLOWED_STATUSES.has(candidate as Status)) return json(400, { error: 'Invalid status' });
  const status = candidate as Status;

  const { error } = await supabaseServer
    .from('b2b_quotes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    logError('admin/devis/[id] PATCH', 'update failed', error);
    return json(500, { error: error.message });
  }
  return json(200, { ok: true });
};
