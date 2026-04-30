import type { APIRoute } from 'astro';
import { requireAdminFromCookie } from '@/lib/admin';
import { supabaseServer } from '@/lib/supabase';
import { logError } from '@/lib/logger';

export const prerender = false;

const ALLOWED = new Set(['pending', 'in_progress', 'answered', 'archived']);

// POST /api/admin/devis-status — form-submit endpoint that updates a single
// b2b_quotes row's status. Auth-gated via requireAdminFromCookie. On
// success, redirects back to /admin/devis/<id>?updated=1.
export const POST: APIRoute = async (context) => {
  const gate = await requireAdminFromCookie(context as never);
  if (gate instanceof Response) return gate;

  const data = await context.request.formData();
  const id = String(data.get('id') ?? '').trim();
  const status = String(data.get('status') ?? '').trim();

  if (!id) {
    return context.redirect('/admin/devis', 302);
  }
  if (!ALLOWED.has(status)) {
    return context.redirect(`/admin/devis/${id}?erreur=status`, 302);
  }

  const { error } = await supabaseServer
    .from('b2b_quotes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    logError('admin/devis-status', 'update failed', error);
    return context.redirect(`/admin/devis/${id}?erreur=db`, 302);
  }

  return context.redirect(`/admin/devis/${id}?updated=1`, 303);
};
