import { supabaseServer } from '@/lib/supabase';
import type { Product } from '@/types/database';

// V1 pricing policy — single source of truth for public-facing prices.
// Supplier `price_ht` column is corrupted (0.39 € on a 9.12 € TTC row) so we
// never read it. See supabase/migrations/20260422120100_pricing_coefficients.sql
// and docs/PHASE-2-FINDINGS.md for the business rule.

const VAT_RATE = 0.2;
const MARGIN_FLOOR_COEF = 1.32;
export const PRICING_FALLBACK_COEF = 1.7;
// Excludes supplier sentinel values (0.02 €). Mirrors SENTINEL_THRESHOLD in
// compute_display_price RPC — keep both in sync.
export const SENTINEL_THRESHOLD = 0.05;
const COEF_TTL_MS = 5 * 60 * 1000;

export type PricingSource = 'manual' | 'coefficient' | 'public_price_ttc' | 'price_ttc' | 'unknown';

export interface DisplayPrice {
  ht: number;
  ttc: number;
  vatRate: number;
  source: PricingSource;
}

export type PricingCoefficientMap = ReadonlyMap<string, number>;

type PricingInput = Pick<
  Product,
  'category' | 'cost_price' | 'manual_price_ht' | 'price_ttc' | 'public_price_ttc'
>;

let coefMapPromise: Promise<PricingCoefficientMap> | null = null;
let coefMapFetchedAt = 0;

export function invalidatePricingCache(): void {
  coefMapPromise = null;
  coefMapFetchedAt = 0;
}

interface CoefficientRow {
  category: string;
  coefficient: number | string;
}

async function loadCoefficients(): Promise<PricingCoefficientMap> {
  const { data, error } = await supabaseServer
    .from('pricing_category_coefficients')
    // Table isn't in the generated Database type yet — cast via `returns<T>()`.
    .select('category, coefficient')
    .returns<CoefficientRow[]>();
  if (error) throw new Error(`fetchPricingCoefficients: ${error.message}`);
  const entries = (data ?? []).map((row) => [row.category, Number(row.coefficient)] as const);
  return new Map(entries);
}

// Cached for COEF_TTL_MS in the SSR process. Coefficients change by UPDATE in
// Studio; a 5-minute stale window is acceptable for V1.
export async function fetchPricingCoefficients(): Promise<PricingCoefficientMap> {
  const now = Date.now();
  if (coefMapPromise && now - coefMapFetchedAt < COEF_TTL_MS) {
    return coefMapPromise;
  }
  coefMapFetchedAt = now;
  // Cache the promise eagerly so concurrent callers share the same in-flight
  // request, but invalidate on rejection — otherwise a single Supabase blip
  // pins a rejected promise in cache for 5 min and every pricing-aware page
  // 500s for that whole window.
  const pending = loadCoefficients();
  coefMapPromise = pending;
  pending.catch(() => {
    if (coefMapPromise === pending) {
      coefMapPromise = null;
      coefMapFetchedAt = 0;
    }
  });
  return pending;
}

function resolveCoef(category: string | null | undefined, coefs: PricingCoefficientMap): number {
  if (category) {
    const direct = coefs.get(category);
    if (typeof direct === 'number') return direct;
  }
  const def = coefs.get('__default__');
  return typeof def === 'number' ? def : PRICING_FALLBACK_COEF;
}

// Priority: manual override > cost_price × category coef > public_price_ttc > price_ttc.
// `price_ht` is intentionally never read — supplier data is unreliable.
// The coefficient is floored at MARGIN_FLOOR_COEF to enforce a 10% margin on cost.
export function computeDisplayPrice(
  product: PricingInput,
  coefs: PricingCoefficientMap,
): DisplayPrice {
  if (product.manual_price_ht != null && Number(product.manual_price_ht) >= SENTINEL_THRESHOLD) {
    const ht = Number(product.manual_price_ht);
    return { ht, ttc: ht * (1 + VAT_RATE), vatRate: VAT_RATE, source: 'manual' };
  }

  if (product.cost_price != null && Number(product.cost_price) >= SENTINEL_THRESHOLD) {
    const cost = Number(product.cost_price);
    const coef = Math.max(resolveCoef(product.category, coefs), MARGIN_FLOOR_COEF);
    const ttc = cost * coef;
    return { ht: ttc / (1 + VAT_RATE), ttc, vatRate: VAT_RATE, source: 'coefficient' };
  }

  if (product.public_price_ttc != null && Number(product.public_price_ttc) >= SENTINEL_THRESHOLD) {
    const ttc = Number(product.public_price_ttc);
    return { ht: ttc / (1 + VAT_RATE), ttc, vatRate: VAT_RATE, source: 'public_price_ttc' };
  }

  if (product.price_ttc != null && Number(product.price_ttc) >= SENTINEL_THRESHOLD) {
    const ttc = Number(product.price_ttc);
    return { ht: ttc / (1 + VAT_RATE), ttc, vatRate: VAT_RATE, source: 'price_ttc' };
  }

  return { ht: 0, ttc: 0, vatRate: VAT_RATE, source: 'unknown' };
}

export function computeDisplayPrices<T extends PricingInput & { id: string }>(
  products: T[],
  coefs: PricingCoefficientMap,
): Map<string, DisplayPrice> {
  const out = new Map<string, DisplayPrice>();
  for (const p of products) out.set(p.id, computeDisplayPrice(p, coefs));
  return out;
}
