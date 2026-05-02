import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { requireAdmin } from '@/lib/admin-api';
import { logError } from '@/lib/logger';
import { estimateReadingMinutes, slugify } from '@/lib/blog';

export const prerender = false;

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

interface GenerateBody {
  topic?: unknown;
  tone?: unknown; // "pratique" | "expert" | "famille" — free text accepted, capped
  length?: unknown; // "court" | "moyen" | "long"
}

const TOPIC_MAX = 500;
const TONE_MAX = 60;

const SYSTEM_PROMPT = `Tu es éditeur du blog d'une papeterie indépendante française à Chaumont (Haute-Marne), Ma Papeterie — Reine & Fils. Tu écris en français pour un public mixte (familles, écoles, TPE/PME locales). Style: chaleureux, pratique, précis, sans jargon marketing. Aucune affirmation invérifiable. Pas d'emojis. Tu rédiges au format Markdown propre (titres ##, listes, gras occasionnel). Tu réponds UNIQUEMENT par un objet JSON valide avec les clés title, excerpt, content_md. Aucun texte hors du JSON.`;

const userPromptFor = (topic: string, tone: string, length: string): string => {
  const wordTarget =
    length === 'long' ? '900-1200 mots' : length === 'court' ? '300-500 mots' : '500-800 mots';
  const toneLine = tone ? `Ton souhaité : ${tone}.` : '';
  return [
    `Sujet : ${topic}`,
    toneLine,
    `Longueur cible : ${wordTarget}.`,
    'Structure attendue :',
    '- title : 50-70 caractères, accrocheur, sans guillemets',
    "- excerpt : 140-180 caractères, résume la promesse de l'article",
    '- content_md : Markdown avec 3 à 5 sections ##, exemples concrets, conseils actionnables, et une conclusion qui invite à découvrir notre boutique sans être commerciale lourde',
    '',
    'Réponds en JSON strict, par exemple :',
    '{"title":"...","excerpt":"...","content_md":"## Sous-titre\\n\\nParagraphe..."}',
  ]
    .filter(Boolean)
    .join('\n');
};

interface AiDraft {
  title: string;
  excerpt: string;
  content_md: string;
}

const parseAiResponse = (raw: string): AiDraft | null => {
  // Strip code fences if the model wrapped the JSON despite the instruction.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    const parsed = JSON.parse(cleaned) as Partial<AiDraft>;
    if (
      typeof parsed.title === 'string' &&
      typeof parsed.excerpt === 'string' &&
      typeof parsed.content_md === 'string' &&
      parsed.title.length > 0 &&
      parsed.content_md.length > 50
    ) {
      return parsed as AiDraft;
    }
  } catch {
    /* fallthrough */
  }
  return null;
};

export const POST: APIRoute = async ({ request }) => {
  const gate = await requireAdmin(request);
  if (gate instanceof Response) return gate;

  const apiKey = import.meta.env.OPENAI_API_KEY;
  if (!apiKey) return json(503, { error: 'openai_key_missing' });

  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const topicRaw = typeof body.topic === 'string' ? body.topic.trim() : '';
  if (topicRaw.length < 5) return json(400, { error: 'topic_too_short' });
  const topic = topicRaw.slice(0, TOPIC_MAX);

  const tone = typeof body.tone === 'string' ? body.tone.trim().slice(0, TONE_MAX) : '';
  const length =
    body.length === 'court' || body.length === 'long' || body.length === 'moyen'
      ? body.length
      : 'moyen';

  const client = new OpenAI({ apiKey });

  let raw = '';
  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPromptFor(topic, tone, length) },
      ],
      temperature: 0.7,
      max_tokens: 2500,
      response_format: { type: 'json_object' },
    });
    raw = completion.choices[0]?.message?.content ?? '';
  } catch (e) {
    logError('admin/blog/generate', 'openai call failed', e);
    return json(502, { error: 'openai_call_failed' });
  }

  const draft = parseAiResponse(raw);
  if (!draft) {
    logError('admin/blog/generate', 'unparseable response', { raw });
    return json(502, { error: 'unparseable_response' });
  }

  return json(200, {
    draft: {
      title: draft.title.slice(0, 200),
      slug: slugify(draft.title),
      excerpt: draft.excerpt.slice(0, 500),
      content_md: draft.content_md.slice(0, 50_000),
      reading_minutes: estimateReadingMinutes(draft.content_md),
      ai_prompt: topic,
    },
  });
};
