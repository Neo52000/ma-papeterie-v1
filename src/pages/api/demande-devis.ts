import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { sendTransactionalEmail } from '@/lib/brevo';
import { logError } from '@/lib/logger';

export const prerender = false;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BESOIN_LEN = 5000;
const MAX_SHORT_LEN = 200;

export const POST: APIRoute = async ({ request }) => {
  const redirect = (path: string) => Response.redirect(new URL(path, request.url).toString(), 303);

  try {
    const data = await request.formData();

    // Honeypot — `website` is a hidden field that humans never see, so any
    // value means a bot. We return 303 to /merci to stay silent (don't tip
    // the bot off that we filtered them).
    const honeypot = String(data.get('website') ?? '').trim();
    if (honeypot.length > 0) {
      return redirect('/devis/?merci=1');
    }

    const nom = String(data.get('nom') ?? '')
      .trim()
      .slice(0, MAX_SHORT_LEN);
    const prenom = String(data.get('prenom') ?? '')
      .trim()
      .slice(0, MAX_SHORT_LEN);
    const societe = String(data.get('societe') ?? '')
      .trim()
      .slice(0, MAX_SHORT_LEN);
    const email = String(data.get('email') ?? '')
      .trim()
      .toLowerCase()
      .slice(0, MAX_SHORT_LEN);
    const telephone =
      String(data.get('telephone') ?? '')
        .trim()
        .slice(0, MAX_SHORT_LEN) || null;
    const besoin = String(data.get('besoin') ?? '')
      .trim()
      .slice(0, MAX_BESOIN_LEN);
    const budget = String(data.get('budget') ?? '')
      .trim()
      .slice(0, MAX_SHORT_LEN);

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
      logError('demande-devis', 'b2b_quotes insert failed', dbError);
      return redirect('/devis/?erreur=1');
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
      } catch (brevoErr) {
        // Quote is in the DB so user flow continues; Élie has the data via
        // Studio. Log so we still see the Brevo regression in function logs.
        logError('demande-devis', 'Brevo sync failed (non-blocking)', brevoErr);
      }
    }

    return redirect('/devis/?merci=1');
  } catch (err) {
    logError('demande-devis', 'Unexpected error in handler', err);
    return redirect('/devis/?erreur=1');
  }
};
