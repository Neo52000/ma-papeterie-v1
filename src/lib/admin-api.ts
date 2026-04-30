// Server-side helper for admin API endpoints. Validates the Bearer token
// + checks the user is in `admin_users`. Returns either a `userId` on
// success or a JSON 401/403 Response the caller should `return`.

import { createClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/types/database';

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export async function requireAdmin(
  request: Request,
): Promise<{ userId: string; email: string } | Response> {
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
  if (userError || !userData.user) return json(401, { error: 'Invalid token' });

  const isAdminRes = (await supabaseServer.rpc('is_admin', { p_user_id: userData.user.id })) as {
    data: boolean | null;
    error: { message: string } | null;
  };
  if (isAdminRes.error || !isAdminRes.data) return json(403, { error: 'Forbidden' });

  return { userId: userData.user.id, email: userData.user.email ?? '' };
}
