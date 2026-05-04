import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { isAllowedOrigin } from '@/lib/origin-guard';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { logError } from '@/lib/logger';

export const prerender = false;

// POST /api/liste-scolaire/ocr
// Body: multipart/form-data with `image` field (jpg, png, webp), max 8 MB.
// Returns: { items: Array<{ quantity: number; name: string }>, raw_text: string }
//
// Uses OpenAI gpt-4o-mini with structured output. Cost ~$0.0001 per
// typical school list image. If OPENAI_API_KEY missing → 500 with clear
// error so admin knows to wire env.

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const SYSTEM_PROMPT = `Tu es un assistant qui extrait des listes de fournitures scolaires depuis une photo
ou un scan. Réponds UNIQUEMENT avec un JSON conforme au schéma demandé.

Règles :
- Une ligne par article distinct
- Quantité par défaut = 1 si non précisée
- Garde le nom de l'article tel qu'écrit (n'invente pas, ne corrige pas l'orthographe)
- Ignore les en-têtes, sous-titres, dates, signatures
- Si plusieurs colonnes, fusionne les en lignes ordonnées
- Si l'image n'est pas une liste (CV, photo de chat, etc.), retourne items: []`;

interface OcrItem {
  quantity: number;
  name: string;
}

interface OcrResponse {
  items: OcrItem[];
  raw_text: string;
}

export const POST: APIRoute = async ({ request }) => {
  // The endpoint is unauthenticated and burns OpenAI tokens per call.
  // Origin filter blocks trivial cross-site abuse; the rate-limit caps
  // same-origin loops at 5/min/IP — well above any real upload pattern
  // and well below a runaway Vision token bill.
  if (!isAllowedOrigin(request)) {
    return json(403, { error: 'Forbidden' });
  }
  const limited = rateLimit(request, RATE_LIMITS.listeScolaireOcr);
  if (limited) return limited;

  const apiKey = import.meta.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(500, {
      error:
        'OCR indisponible — la clé OPENAI_API_KEY n’est pas configurée. Contactez l’administrateur.',
    });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json(400, { error: 'Invalid multipart form-data' });
  }

  const file = formData.get('image');
  if (!(file instanceof File)) {
    return json(400, { error: 'Champ "image" manquant' });
  }
  if (file.size === 0) return json(400, { error: 'Fichier vide' });
  if (file.size > MAX_BYTES) {
    return json(400, {
      error: `Fichier trop gros (${Math.round(file.size / 1024)} KB). Max 8 MB.`,
    });
  }
  if (!ACCEPTED_TYPES.has(file.type)) {
    return json(400, {
      error: `Format non supporté (${file.type}). Utilisez JPG, PNG ou WEBP.`,
    });
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const dataUrl = `data:${file.type};base64,${base64}`;

  const client = new OpenAI({ apiKey });

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extrait la liste des fournitures scolaires de cette image.' },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'school_list',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['items', 'raw_text'],
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['quantity', 'name'],
                  properties: {
                    quantity: { type: 'integer', minimum: 1, maximum: 999 },
                    name: { type: 'string', minLength: 1, maxLength: 200 },
                  },
                },
              },
              raw_text: {
                type: 'string',
                description: 'Le texte brut de la liste, ligne par ligne, tel que dans l’image.',
              },
            },
          },
        },
      },
      max_tokens: 2000,
      temperature: 0,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return json(500, { error: 'Réponse vide de l’OCR' });
    }

    const parsed = JSON.parse(content) as OcrResponse;
    return json(200, parsed);
  } catch (err) {
    logError('liste-scolaire/ocr', 'OpenAI call failed', err);
    return json(500, {
      error: err instanceof Error ? err.message : 'Erreur OCR',
    });
  }
};
