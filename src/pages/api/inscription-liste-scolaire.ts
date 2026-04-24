import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';

export const prerender = false;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request }) => {
  const redirect = (path: string) => Response.redirect(new URL(path, request.url).toString(), 303);

  try {
    const data = await request.formData();
    const email = String(data.get('email') ?? '')
      .trim()
      .toLowerCase();
    const prenom = String(data.get('prenom') ?? '').trim();
    const niveau = String(data.get('niveau') ?? '').trim();

    if (!EMAIL_REGEX.test(email)) {
      return redirect('/liste-scolaire/?erreur=email');
    }

    const { error: dbError } = await supabaseServer
      .from('notification_waitlist')
      .upsert(
        { email, feature: 'liste_scolaire', metadata: { prenom, niveau } },
        { onConflict: 'email,feature' },
      );

    if (dbError) {
      console.error('[inscription-liste-scolaire] DB error:', dbError.message);
      return redirect('/liste-scolaire/?erreur=1');
    }

    if (import.meta.env.BREVO_API_KEY) {
      try {
        await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: {
            'api-key': import.meta.env.BREVO_API_KEY,
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({
            email,
            attributes: { PRENOM: prenom, NIVEAU_SCOLAIRE: niveau },
            // TODO: remplacer par l'ID réel de la liste Brevo "liste-scolaire-waitlist"
            listIds: [],
            updateEnabled: true,
          }),
        });
      } catch (brevoErr) {
        console.warn('[inscription-liste-scolaire] Brevo sync failed (non-blocking):', brevoErr);
      }
    }

    return redirect('/liste-scolaire/?merci=1');
  } catch (err) {
    console.error('[inscription-liste-scolaire] Unexpected error:', err);
    return redirect('/liste-scolaire/?erreur=1');
  }
};
