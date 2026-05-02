import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { isAllowedOrigin } from '@/lib/origin-guard';
import { sendTransactionalEmail, escapeHtml } from '@/lib/brevo';
import { logError } from '@/lib/logger';
import type { TamponDesign, TamponShape } from '@/types/tampon';

export const prerender = false;

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_SHAPES: TamponShape[] = ['rond', 'ovale', 'rectangle', 'carre'];

interface PayloadContact {
  company?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  notes?: unknown;
}

interface Payload {
  design?: unknown;
  contact?: unknown;
}

const isString = (v: unknown): v is string => typeof v === 'string';

const sanitizeDesign = (raw: unknown): TamponDesign | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const d = raw as Partial<TamponDesign>;
  if (!isString(d.shape) || !VALID_SHAPES.includes(d.shape as TamponShape)) return null;
  if (typeof d.diameterMm !== 'number' || d.diameterMm < 10 || d.diameterMm > 200) return null;
  if (!isString(d.borderColor) || !/^#[0-9a-fA-F]{3,8}$/.test(d.borderColor)) return null;
  if (!Array.isArray(d.lines) || d.lines.length === 0 || d.lines.length > 8) return null;

  const lines = d.lines.slice(0, 5).map((l: unknown) => {
    if (typeof l !== 'object' || l === null) return null;
    const line = l as Record<string, unknown>;
    if (!isString(line.text) || line.text.length > 80) return null;
    if (!isString(line.fontFamily) || line.fontFamily.length > 80) return null;
    if (typeof line.fontSize !== 'number' || line.fontSize < 8 || line.fontSize > 60) return null;
    return {
      text: line.text,
      fontFamily: line.fontFamily,
      fontSize: line.fontSize,
      bold: line.bold === true,
    };
  });
  if (lines.some((l) => l === null)) return null;

  return {
    shape: d.shape as TamponShape,
    diameterMm: d.diameterMm,
    borderColor: d.borderColor,
    lines: lines as TamponDesign['lines'],
  };
};

const sanitizeContact = (
  raw: unknown,
): {
  company: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string;
} | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const c = raw as PayloadContact;
  const company = isString(c.company) ? c.company.trim().slice(0, 120) : '';
  const name = isString(c.name) ? c.name.trim().slice(0, 100) : '';
  const email = isString(c.email) ? c.email.trim().toLowerCase().slice(0, 150) : '';
  const phone = isString(c.phone) ? c.phone.trim().slice(0, 30) : '';
  const notes = isString(c.notes) ? c.notes.trim().slice(0, 1000) : '';
  if (company.length < 2) return null;
  if (!EMAIL_RE.test(email)) return null;
  return { company, name, email, phone: phone || null, notes };
};

const formatDesignSummary = (d: TamponDesign): string => {
  const linesTxt = d.lines
    .map(
      (l, i) =>
        `  L${i + 1}: "${l.text}" — ${l.fontFamily.split(',')[0]} ${l.fontSize}px${l.bold ? ' bold' : ''}`,
    )
    .join('\n');
  return [
    `Tampon personnalisé`,
    `Forme : ${d.shape} · ${d.diameterMm} mm · couleur ${d.borderColor}`,
    `Lignes :`,
    linesTxt,
  ].join('\n');
};

export const POST: APIRoute = async ({ request }) => {
  if (!isAllowedOrigin(request)) return json(403, { error: 'origin_not_allowed' });

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const design = sanitizeDesign(payload.design);
  if (!design) return json(400, { error: 'invalid_design' });

  const contact = sanitizeContact(payload.contact);
  if (!contact) return json(400, { error: 'invalid_contact' });

  const designSummary = formatDesignSummary(design);
  const message = contact.notes
    ? `${designSummary}\n\nNotes client :\n${contact.notes}\n\nDesign JSON :\n${JSON.stringify(design)}`
    : `${designSummary}\n\nDesign JSON :\n${JSON.stringify(design)}`;

  const { error: dbError } = await supabaseServer.from('b2b_quotes').insert({
    company_name: contact.company,
    siret: null,
    contact_name: contact.name || null,
    email: contact.email,
    phone: contact.phone,
    message,
    attachment_url: null,
    source: 'tampon-designer',
  } as never);

  if (dbError) {
    logError('tampon/order', 'b2b_quotes insert failed', dbError);
    return json(500, { error: 'db_error' });
  }

  if (import.meta.env.BREVO_API_KEY) {
    try {
      await sendTransactionalEmail({
        to: [{ email: 'reine.elie@gmail.com', name: 'Élie' }],
        sender: { email: 'noreply@ma-papeterie.fr', name: 'Ma Papeterie' },
        subject: `Nouvelle demande tampon — ${contact.company}`,
        htmlContent: `
          <p>Nouvelle demande de tampon personnalisé reçue via /tampon.</p>
          <ul>
            <li><strong>Société :</strong> ${escapeHtml(contact.company)}</li>
            <li><strong>Contact :</strong> ${escapeHtml(contact.name || 'non renseigné')}</li>
            <li><strong>Email :</strong> ${escapeHtml(contact.email)}</li>
            <li><strong>Téléphone :</strong> ${escapeHtml(contact.phone ?? 'non renseigné')}</li>
          </ul>
          <p><strong>Design :</strong></p>
          <pre style="background:#f5f5f5;padding:12px;border-radius:6px;font-size:13px;">${escapeHtml(designSummary)}</pre>
          ${contact.notes ? `<p><strong>Notes :</strong><br>${escapeHtml(contact.notes).replace(/\n/g, '<br>')}</p>` : ''}
          <p style="font-size:12px;color:#666;">Voir détail dans /admin/devis (filtrer source = tampon-designer).</p>
        `,
      });
    } catch (brevoErr) {
      logError('tampon/order', 'Brevo notification failed (non-blocking)', brevoErr);
    }
  }

  return json(201, { ok: true });
};
