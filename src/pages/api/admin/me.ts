import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/admin-api';

export const prerender = false;

// GET /api/admin/me — Bearer-auth check used by client-side admin guard.
// Delegates to requireAdmin so the auth flow stays in one place.
// Returns 200 { isAdmin: true, email, userId } on success;
// requireAdmin handles 401 (missing/invalid token) and 403 (authenticated
// but not in admin_users). The 403 path used to be a 200 with
// isAdmin:false here — switched to 403 because returning 200 leaked the
// fact that the token was valid (info disclosure for an attacker
// brute-forcing tokens). AdminGuard.tsx already treats !res.ok as
// "forbidden" so the UX is unchanged.

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const GET: APIRoute = async ({ request }) => {
  const gate = await requireAdmin(request);
  if (gate instanceof Response) return gate;
  return json(200, { isAdmin: true, email: gate.email, userId: gate.userId });
};
