import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { computeDisplayPrice, fetchPricingCoefficients } from '@/lib/pricing';
import { isAllowedOrigin } from '@/lib/origin-guard';
import { logError } from '@/lib/logger';
import type { Product } from '@/types/database';

export const prerender = false;

const MAX_BODY_SIZE = 100_000;

// POST /api/liste-scolaire/match
// Body: { text: string }
//
// Splits the pasted school list into lines, normalises each one (strip
// quantity prefix / leading bullet / trailing punctuation), then runs a
// websearch full-text query on products.search_vector to surface up to 3
// candidates per line. Returns the candidates with display price already
// computed so the React component can render them ready to add to cart.
//
// Lines that match nothing come back in `unmatched` so the user can adjust
// wording or fall back to the devis B2B form for hard-to-find items.

interface MatchResult {
  rawLine: string;
  query: string;
  quantity: number;
  candidates: Array<{
    id: string;
    name: string;
    slug: string | null;
    brand: string | null;
    imageUrl: string | null;
    priceTtc: number;
    priceHt: number;
    shopifyVariantId: string | null;
  }>;
}

interface MatchResponse {
  matches: MatchResult[];
  unmatched: Array<{ rawLine: string; query: string; quantity: number }>;
}

const MAX_LINES = 80;
const MAX_CHARS_PER_LINE = 200;
const CANDIDATES_PER_LINE = 3;

// Pulls a leading "12 ", "12x ", "12 x ", "- 12 ", "•12-" off the line and
// returns { quantity, rest }. Defaults to quantity=1 when no prefix matches.
function extractQuantity(line: string): { quantity: number; rest: string } {
  const m = line.match(/^[\s•·\-*]*([0-9]{1,3})\s*[x×]?\s+(.+)$/i);
  if (!m) return { quantity: 1, rest: line.replace(/^[\s•·\-*]+/, '').trim() };
  const qty = Math.min(Math.max(parseInt(m[1], 10), 1), 99);
  return { quantity: qty, rest: m[2].trim() };
}

// FTS websearch syntax: drop punctuation that confuses the parser, collapse
// whitespace. Keep the words themselves intact (the FTS config does the
// stemming + accent folding).
function buildQuery(rest: string): string {
  return rest
    .replace(/[(),:;!?"'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CHARS_PER_LINE);
}

const SELECT_COLS =
  'id,name,slug,brand,image_url,cost_price,public_price_ttc,manual_price_ht,price_ttc,tva_rate,category,shopify_variant_id';

export const POST: APIRoute = async ({ request }) => {
  // Endpoint is unauthenticated and a single call fans out to up to
  // MAX_LINES (80) sequential FTS queries. Reject anything that doesn't
  // carry our own Origin header — same lightweight CSRF/scrape filter
  // as /api/liste-scolaire/ocr. Real rate-limiting is V2.1 backlog.
  if (!isAllowedOrigin(request)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_SIZE) {
    return new Response('Payload too large', { status: 413 });
  }

  let body: { text?: unknown };
  try {
    body = (await request.json()) as { text?: unknown };
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text : '';
  if (!text.trim()) {
    return new Response(JSON.stringify({ matches: [], unmatched: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, MAX_LINES);

  const coefs = await fetchPricingCoefficients();

  const matches: MatchResult[] = [];
  const unmatched: MatchResponse['unmatched'] = [];

  for (const rawLine of lines) {
    const { quantity, rest } = extractQuantity(rawLine);
    const query = buildQuery(rest);
    if (!query || query.length < 2) {
      unmatched.push({ rawLine, query, quantity });
      continue;
    }

    const { data, error } = await supabaseServer
      .from('products')
      .select(SELECT_COLS)
      .eq('is_active', true)
      .eq('is_vendable', true)
      .not('slug', 'is', null)
      .not('image_url', 'is', null)
      .textSearch('search_vector', query, { config: 'french', type: 'websearch' })
      .limit(CANDIDATES_PER_LINE);

    if (error) {
      // FTS shouldn't fail (search_vector is a maintained tsvector column)
      // but log it if it does so we know the bulk-sync didn't break the index.
      // The line falls into "unmatched" — the user just sees no candidates,
      // not an error.
      logError('liste-scolaire/match', `FTS query failed for "${query}"`, error);
    }
    if (error || !data || data.length === 0) {
      unmatched.push({ rawLine, query, quantity });
      continue;
    }

    matches.push({
      rawLine,
      query,
      quantity,
      candidates: data.map((p) => {
        const product = p as Product;
        const { ht, ttc } = computeDisplayPrice(product, coefs);
        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          brand: product.brand,
          imageUrl: product.image_url,
          priceTtc: ttc,
          priceHt: ht,
          shopifyVariantId: product.shopify_variant_id,
        };
      }),
    });
  }

  const response: MatchResponse = { matches, unmatched };
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};
