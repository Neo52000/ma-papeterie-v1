import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/admin-api';
import { logError } from '@/lib/logger';

export const prerender = false;

// POST /api/admin/shopify-sync-trigger
// Body: { eans: string[] }
//
// Déclenche le workflow GitHub Actions « Shopify Sync » avec une liste
// d'EAN priorisés. Permet à l'admin de pousser des modifs stock_boutique
// vers Shopify en 1 clic depuis /admin/stock-boutique au lieu de
// copier-coller dans l'UI GitHub Actions.
//
// Prérequis : env vars
//   - GITHUB_TOKEN : Fine-grained Personal Access Token avec scope
//     "Actions: Read and write" sur Neo52000/ma-papeterie-v1.
//     Sans ce token, l'endpoint retourne 503 (le bouton UI tombe sur le
//     fallback 2-clic).
//   - GITHUB_REPO  : optionnel, défaut "Neo52000/ma-papeterie-v1".

const GH_API = 'https://api.github.com';
const WORKFLOW_FILE = 'shopify-sync.yml';
const MAX_EANS_PER_RUN = 100;
// Validation EAN : 8 ou 13 chiffres (EAN-8 / EAN-13). Évite d'envoyer
// du junk au workflow (et de polluer les logs GH).
const EAN_RE = /^\d{8}(?:\d{5})?$/;

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

interface TriggerBody {
  eans?: unknown;
}

export const POST: APIRoute = async ({ request }) => {
  const gate = await requireAdmin(request);
  if (gate instanceof Response) return gate;

  let body: TriggerBody;
  try {
    body = (await request.json()) as TriggerBody;
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  if (!Array.isArray(body.eans)) {
    return json(400, { error: 'eans_must_be_array' });
  }
  const eans = body.eans
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter((v) => EAN_RE.test(v))
    .slice(0, MAX_EANS_PER_RUN);
  if (eans.length === 0) {
    return json(400, { error: 'no_valid_eans' });
  }

  const token = import.meta.env.GITHUB_TOKEN;
  if (!token) {
    // Pas de token = on tombe sur le fallback 2-clic côté UI. Status 503
    // distinct de 500 pour que le client distingue « pas configuré » de
    // « vraie erreur GH API ».
    return json(503, {
      error: 'github_token_not_configured',
      hint: 'Provisionner GITHUB_TOKEN (Fine-grained PAT scope Actions:write) côté Netlify pour activer le push 1-clic.',
    });
  }
  const repo = import.meta.env.GITHUB_REPO ?? 'Neo52000/ma-papeterie-v1';

  // GitHub workflow_dispatch : asynchrone (renvoie 204 sans run id). Le
  // run apparaît ~2-5s plus tard dans Actions. On renvoie au client le
  // lien direct vers la liste des runs récents pour qu'il puisse suivre.
  try {
    const ghRes = await fetch(
      `${GH_API}/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        method: 'POST',
        headers: {
          accept: 'application/vnd.github+json',
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'x-github-api-version': '2022-11-28',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            mode: 'stale',
            max: '200',
            eans: eans.join(','),
          },
        }),
      },
    );

    if (!ghRes.ok) {
      const text = await ghRes.text();
      logError('admin/shopify-sync-trigger', `GH dispatch failed ${ghRes.status}`, text);
      return json(502, { error: 'github_api_error', status: ghRes.status });
    }

    return json(200, {
      ok: true,
      eans_count: eans.length,
      runs_url: `https://github.com/${repo}/actions/workflows/${WORKFLOW_FILE}`,
    });
  } catch (err) {
    logError('admin/shopify-sync-trigger', 'fetch failed', err);
    return json(500, { error: 'internal' });
  }
};
