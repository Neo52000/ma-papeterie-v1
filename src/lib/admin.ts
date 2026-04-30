// Admin gating helpers — server-side only.
//
// Pattern : chaque page sous /admin appelle `requireAdminFromCookie(Astro)`
// dans le frontmatter. Si l'utilisateur n'est pas admin, on retourne une
// Response (redirect ou 403) que la page propage via `return`.

import type { AstroGlobal } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/types/database';

export interface AdminContext {
  userId: string;
  email: string;
}

/**
 * Reads the Supabase auth cookie from the request and verifies the user is
 * in `admin_users`. Returns `{ userId, email }` if admin, else a Response
 * the caller must `return` (redirect to /connexion or 403).
 */
export async function requireAdminFromCookie(astro: AstroGlobal): Promise<AdminContext | Response> {
  const accessToken = astro.cookies.get('sb-access-token')?.value;
  // Fallback: Supabase client default cookie name format `sb-<project-ref>-auth-token`.
  const projectRef = (import.meta.env.PUBLIC_SUPABASE_URL ?? '').match(
    /https:\/\/(.+?)\.supabase/,
  )?.[1];
  const projectCookieName = projectRef ? `sb-${projectRef}-auth-token` : null;
  const projectCookieRaw = projectCookieName ? astro.cookies.get(projectCookieName)?.value : null;

  let token: string | null = accessToken ?? null;

  if (!token && projectCookieRaw) {
    // Supabase serializes the session as JSON in the cookie. Decode and pull access_token.
    try {
      const parsed = JSON.parse(decodeURIComponent(projectCookieRaw)) as
        | { access_token?: string; currentSession?: { access_token?: string } }
        | string;
      if (typeof parsed === 'object' && parsed !== null) {
        token = parsed.access_token ?? parsed.currentSession?.access_token ?? null;
      }
    } catch {
      /* malformed cookie — treat as anon */
    }
  }

  if (!token) {
    const next = encodeURIComponent(astro.url.pathname);
    return astro.redirect(`/connexion?next=${next}`, 302);
  }

  // Verify the token + extract user via a per-request anon client (no service-role).
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  const authClient = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) {
    const next = encodeURIComponent(astro.url.pathname);
    return astro.redirect(`/connexion?next=${next}`, 302);
  }

  // Check admin status via service-role to bypass RLS noise.
  const isAdminRes = (await supabaseServer.rpc('is_admin', { p_user_id: userData.user.id })) as {
    data: boolean | null;
    error: { message: string } | null;
  };
  if (isAdminRes.error || !isAdminRes.data) {
    return new Response('Forbidden', { status: 403 });
  }

  return {
    userId: userData.user.id,
    email: userData.user.email ?? '',
  };
}
