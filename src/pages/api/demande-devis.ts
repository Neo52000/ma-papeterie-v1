import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { sendTransactionalEmail } from '@/lib/brevo';

export const prerender = false;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request }) => {
  const redirect = (path: string) => Response.redirect(new URL(path, request.url).toString(), 303);

  try {
    const data = await request.formData();
    const nom = String(data.get('nom') ?? '').trim();
    const prenom = String(data.get('prenom') ?? '').trim();
    const societe = String(data.get('societe') ?? '').trim();
    const email = String(data.get('email') ?? '')
      .trim()
      .toLowerCase();
    const telephone = String(data.get('telephone') ?? '').trim() || null;
    const besoin = String(data.get('besoin') ?? '').trim();
    const budget = String(data.get('budget') ?? '').trim();

    if (!nom && !prenom) return redirect('/devis/?erreur=contact');
    if (!societe) return redirect('/devis/?erreur=societe');
    if (!EMAIL_REGEX.test(email)) return redirect('/devis/?erreur=email');
    if (!besoin) return redirect('/devis/?erreur=besoin');

    const contactName = [prenom, nom].filter(Boolean).join(' ');
    const message = budget ? `${besoin}\n\nBudget estimé : ${budget}` : besoin;

    const { error: dbError } = await supabaseServer.from('b2b_quotes').insert({
      company_name: societe,
      siret: null,
      contact_name: contactName,
      email,
      phone: telephone,
      message,
      attachment_url: null,
    });

    if (dbError) {
      throw new Error(`demande-devis insert failed: ${dbError.message}`);
    }

    if (import.meta.env.BREVO_API_KEY) {
      try {
        // Ajout contact dans liste "devis-b2b-leads"
        await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: {
            'api-key': import.meta.env.BREVO_API_KEY,
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({
            email,
            attributes: { PRENOM: prenom, NOM: nom, COMPANY: societe, PHONE: telephone ?? '' },
            // V2 — remplacer par l'ID réel de la liste Brevo "devis-b2b-leads"
            // (créer la liste depuis le dashboard Brevo, copier l'ID numérique).
            listIds: [],
            updateEnabled: true,
          }),
        });

        // Notification email à Élie
        await sendTransactionalEmail({
          to: [{ email: 'reine.elie@gmail.com', name: 'Élie' }],
          sender: { email: 'noreply@ma-papeterie.fr', name: 'Ma Papeterie' },
          subject: `Nouvelle demande de devis — ${societe}`,
          htmlContent: `
            <p>Nouvelle demande de devis reçue.</p>
            <ul>
              <li><strong>Contact :</strong> ${contactName}</li>
              <li><strong>Société :</strong> ${societe}</li>
              <li><strong>Email :</strong> ${email}</li>
              <li><strong>Téléphone :</strong> ${telephone ?? 'non renseigné'}</li>
              <li><strong>Budget :</strong> ${budget || 'non renseigné'}</li>
            </ul>
            <p><strong>Besoin :</strong><br>${besoin.replace(/\n/g, '<br>')}</p>
          `,
        });
      } catch {
        // Brevo failure is non-blocking — the quote is already in the DB and
        // Élie will see it via Supabase Studio. Swallow to keep the user flow.
      }
    }

    return redirect('/devis/?merci=1');
  } catch {
    // The Netlify function logs preserve the stack trace; the user is sent
    // back to the form with the generic error banner.
    return redirect('/devis/?erreur=1');
  }
};
