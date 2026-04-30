import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import type { Database } from '@/types/database';

export const prerender = false;

// GET /api/admin/me — Bearer-auth check used by client-side admin guard.
// Returns { isAdmin: boolean, email: string } or 401 if token missing/invalid.

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const GET: APIRoute = async ({ request }) => {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return json(401, { error: 'Missing bearer token' });

  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  const authClient = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) {
    return json(401, { error: 'Invalid token' });
  }

  const isAdminRes = (await supabaseServer.rpc('is_admin', { p_user_id: userData.user.id })) as {
    data: boolean | null;
    error: { message: string } | null;
  };
  if (isAdminRes.error) {
    logError('admin/me', 'is_admin RPC failed', isAdminRes.error);
    return json(500, { error: 'Internal error' });
  }

  return json(200, {
    isAdmin: !!isAdminRes.data,
    email: userData.user.email ?? '',
    userId: userData.user.id,
  });
};
