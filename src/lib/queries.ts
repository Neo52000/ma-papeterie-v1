import { supabaseServer } from '@/lib/supabase';
import { computeDisplayPrice, type PricingCoefficientMap } from '@/lib/pricing';
import type { Category, Product, ProductImage } from '@/types/database';

// ---------------------------------------------------------------------------
// Public catalogue — read through `public.products` + `product_images`.
// All queries filter on `is_active` + `is_vendable` so a product that is
// flagged as end-of-life / hidden cannot leak to the public site.
// `slug IS NOT NULL` gates products out until the Comlandi sync backfills
// their public URL (cf. docs/PHASE-2-SCHEMA-REPORT.md §Recommandations).
// ---------------------------------------------------------------------------

export const CATALOGUE_PAGE_SIZE = 24;

export type SortKey = 'pertinence' | 'price-asc' | 'price-desc' | 'newest';

const toFilterArray = (value: string | string[] | undefined): string[] => {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.map((v) => v.trim()).filter((v) => v.length > 0);
};

export interface CatalogueFilters {
  category?: string | string[];
  brand?: string | string[];
  priceMin?: number;
  priceMax?: number;
  inStockOnly?: boolean;
  search?: string;
  /** Module Promotions (V2.3) : filtre `?promo=1` → ne renvoie que les
   *  produits avec un `compare_at_ttc` non nul (override admin). */
  promoOnly?: boolean;
}

export interface CatalogueQuery extends CatalogueFilters {
  page?: number;
  sort?: SortKey;
}

export interface CatalogueResult {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Stock dual (V2.1) : on lit stock_online + stock_boutique + sales_channel
// en plus de la colonne legacy stock_quantity. Le trigger compat garantit
// stock_quantity = stock_online à chaque write, mais on consomme désormais
// stock_online directement côté lecture. La colonne legacy reste sélectionnée
// pour les helpers / scripts encore branchés dessus pendant la transition.
const PUBLIC_PRODUCT_COLUMNS =
  'id,name,slug,description,brand,category,subcategory,ean,manufacturer_code,price,price_ht,price_ttc,public_price_ttc,cost_price,manual_price_ht,tva_rate,stock_quantity,stock_online,stock_boutique,sales_channel,available_qty_total,is_available,image_url,badge,is_featured,shopify_variant_id,created_at,updated_at';
  'id,name,slug,description,brand,category,subcategory,ean,manufacturer_code,price,price_ht,price_ttc,public_price_ttc,compare_at_ttc,cost_price,manual_price_ht,tva_rate,stock_quantity,stock_online,stock_boutique,sales_channel,available_qty_total,is_available,image_url,badge,is_featured,shopify_variant_id,created_at,updated_at';

export async function fetchCatalogue(opts: CatalogueQuery = {}): Promise<CatalogueResult> {
  const pageRequested = Math.max(1, opts.page ?? 1);
  const pageSize = CATALOGUE_PAGE_SIZE;

  // Count strategy:
  //   - Unfiltered listing → RPC count_displayable_products (Index Only Scan on
  //     idx_products_displayable, ~5ms exact). Pre-fetched to clamp the page BEFORE
  //     the data query. Data query uses count:'exact' so PostgREST validates the
  //     Range header against the true row count (avoids 416 on the last partial page).
  //   - Filtered listing → count: 'estimated' embedded (tolerable imprecision).
  //     Note: filtered + page > totalPages will throw HTTP 416 (see
  //     PHASE-2-FINDINGS.md "TODO pagination filtered edge case").
  const categoryList = toFilterArray(opts.category);
  const brandList = toFilterArray(opts.brand);
  const isUnfilteredListing =
    categoryList.length === 0 &&
    brandList.length === 0 &&
    opts.priceMin === undefined &&
    opts.priceMax === undefined &&
    !opts.search &&
    !opts.inStockOnly &&
    !opts.promoOnly;

  // For unfiltered listing: call the RPC BEFORE the data query to clamp the
  // requested page. The RPC does COUNT(*) via Index Only Scan on
  // idx_products_displayable (~5ms). We also use count:'exact' in the data
  // query so PostgREST validates the Range header against the true row count
  // (not the planner estimate of ~2400 that caused HTTP 416 on pages >100).
  //
  // For filtered listing: count:'estimated' is acceptable — planner estimate
  // is proportional to the filter selectivity. 416 on page > totalPages is
  // documented (see PHASE-2-FINDINGS.md "TODO pagination filtered edge case").
  let totalFromRpc: number | null = null;
  if (isUnfilteredListing) {
    // RPC return type is not in the generated Database.Functions (out of
    // scope for V1 type gen). Cast data to the known bigint-as-number shape.
    const rpcResult = (await supabaseServer.rpc('count_displayable_products')) as {
      data: number | null;
      error: { message: string } | null;
    };
    // Silent fallback to the embedded `count: 'estimated'` if the RPC fails
    // — the estimated count is good enough for pagination and avoids surfacing
    // a transient Supabase blip to the user. Add structured logging here when
    // observability lands (Phase 7).
    if (!rpcResult.error && rpcResult.data != null) {
      totalFromRpc = Number(rpcResult.data);
    }
  }

  const preClampedTotalPages =
    totalFromRpc != null ? Math.max(1, Math.ceil(totalFromRpc / pageSize)) : null;
  const pageEffective = preClampedTotalPages
    ? Math.min(pageRequested, preClampedTotalPages)
    : pageRequested;

  const from = (pageEffective - 1) * pageSize;
  const to = from + pageSize - 1;

  // count:'exact' for unfiltered — PostgREST uses the true row count to
  // validate the Range header, preventing 416 on the last partial page.
  // count:'estimated' for filtered — planner estimate is acceptable there.
  const countMode = isUnfilteredListing ? 'exact' : 'estimated';

  let query = supabaseServer
    .from('products')
    .select(PUBLIC_PRODUCT_COLUMNS, { count: countMode })
    .eq('is_active', true)
    .eq('is_vendable', true)
    // Stock dual : exclut les produits POS-only du catalogue web. Les
    // produits 'online' et 'both' restent visibles ; les 'pos' (services,
    // vrac, articles sans code-barres) ne doivent jamais apparaître côté
    // site même s'ils sont actifs/vendables.
    .in('sales_channel', ['online', 'both'])
    .not('slug', 'is', null)
    .not('image_url', 'is', null)
    // Defence in depth against sentinel-only rows (cf. SENTINEL_THRESHOLD in
    // lib/pricing.ts). DB constraints `cost_price_no_sentinel` and
    // `public_price_ttc_no_sentinel` block reintroduction; this filter excludes
    // the residual handful where the entire price hierarchy is null/sentinel
    // and computeDisplayPrice would return source='unknown' (= 0 € display).
    // Order mirrors the cascade in lib/pricing.ts.
    .or(
      'manual_price_ht.gte.0.05,cost_price.gte.0.05,public_price_ttc.gte.0.05,price_ttc.gte.0.05',
    );

  if (categoryList.length === 1) {
    query = query.eq('category', categoryList[0]);
  } else if (categoryList.length > 1) {
    query = query.in('category', categoryList);
  }
  if (brandList.length === 1) {
    query = query.eq('brand', brandList[0]);
  } else if (brandList.length > 1) {
    query = query.in('brand', brandList);
  }
  if (typeof opts.priceMin === 'number' && Number.isFinite(opts.priceMin)) {
    query = query.gte('price_ttc', opts.priceMin);
  }
  if (typeof opts.priceMax === 'number' && Number.isFinite(opts.priceMax)) {
    query = query.lte('price_ttc', opts.priceMax);
  }
  if (opts.inStockOnly) {
    // Filtre sur stock_online (V2.1) : stock_boutique ne compte pas pour
    // l'e-commerce. Le trigger compat garantit que stock_quantity reste
    // synchronisé, mais on tape directement la nouvelle colonne.
    query = query.gt('stock_online', 0);
  }
  if (opts.promoOnly) {
    // Module Promotions (V2.3) : compare_at_ttc NOT NULL = en promo.
    // Index partiel `idx_products_compare_at_ttc` couvre ce filter.
    query = query.not('compare_at_ttc', 'is', null);
  }
  if (opts.search && opts.search.trim().length >= 2) {
    // Full-text search via the Phase 2 `search_vector` column + GIN index.
    // `websearch_to_tsquery` accepts natural syntax: spaces=AND, quotes=phrase,
    // leading `-`=exclusion — safe to forward raw user input.
    // Performance baseline (avril 2026): ~120ms cold, ~50ms warm on 141k rows
    // with GIN index. Debounce 300ms côté front pour absorber.
    query = query.textSearch('search_vector', opts.search.trim(), {
      config: 'french',
      type: 'websearch',
    });
  }

  switch (opts.sort ?? 'pertinence') {
    case 'price-asc':
      query = query.order('price_ttc', { ascending: true, nullsFirst: false });
      break;
    case 'price-desc':
      query = query.order('price_ttc', { ascending: false, nullsFirst: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'pertinence':
    default:
      // Stable default: featured first, then recent.
      query = query
        .order('is_featured', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      break;
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(`fetchCatalogue: ${error.message}`);

  // Prefer RPC count (precise, unfiltered) over embedded estimate (filtered).
  const total = totalFromRpc ?? count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items: (data ?? []) as Product[],
    total,
    page: pageEffective,
    pageSize,
    totalPages,
  };
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabaseServer
    .from('products')
    .select(PUBLIC_PRODUCT_COLUMNS)
    .eq('is_active', true)
    .eq('is_vendable', true)
    // Stock dual : un produit POS-only ne doit pas exposer sa fiche web
    // même si quelqu'un connaît son slug — sinon clients confus + Add to
    // cart appuie sur du stock fantôme.
    .in('sales_channel', ['online', 'both'])
    .eq('slug', slug)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`fetchProductBySlug: ${error.message}`);
  return (data as Product | null) ?? null;
}

export async function fetchProductImages(productId: string): Promise<ProductImage[]> {
  const { data, error } = await supabaseServer
    .from('product_images')
    .select('id,product_id,url_originale,position,created_at')
    .eq('product_id', productId)
    .order('position', { ascending: true, nullsFirst: false })
    .limit(8);
  if (error) throw new Error(`fetchProductImages: ${error.message}`);
  return (data ?? []) as ProductImage[];
}

export async function fetchRelatedProducts(
  productId: string,
  category: string,
  limit = 4,
): Promise<Product[]> {
  const { data, error } = await supabaseServer
    .from('products')
    .select(PUBLIC_PRODUCT_COLUMNS)
    .eq('is_active', true)
    .eq('is_vendable', true)
    .not('slug', 'is', null)
    .not('image_url', 'is', null)
    .eq('category', category)
    .neq('id', productId)
    .order('is_featured', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`fetchRelatedProducts: ${error.message}`);
  return (data ?? []) as Product[];
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function fetchRootCategories(limit = 6): Promise<Category[]> {
  const { data, error } = await supabaseServer
    .from('categories')
    .select(
      'id,name,slug,level,parent_id,description,image_url,sort_order,is_active,created_at,updated_at',
    )
    .eq('is_active', true)
    .is('parent_id', null)
    .order('sort_order', { ascending: true })
    .limit(limit);
  if (error) throw new Error(`fetchRootCategories: ${error.message}`);
  return (data ?? []) as Category[];
}

// The two helpers below back the catalogue filter sidebar. They rely on two
// Postgres SQL functions declared in
// `supabase/migrations/20260421010000_catalogue_distinct_rpcs.sql` so the
// DISTINCT happens inside Postgres (141k-row table, GIN index on `category`/
// `brand` already present). On a DB where the RPCs haven't been applied yet,
// the call fails silently upstream (Promise.all catch in catalogue/index.astro)
// and the select degrades to "Toutes" — acceptable for a filter UI.
// ---------------------------------------------------------------------------
// Sitemap helpers — used by src/pages/sitemap-*.xml.ts SSR endpoints.
// ---------------------------------------------------------------------------

export const SITEMAP_PRODUCTS_PER_PAGE = 5000;

export interface SitemapEntry {
  slug: string;
  updated_at: string;
  image_url?: string | null;
}

export async function countVendableProducts(): Promise<number> {
  // RPC `count_displayable_products` does an exact COUNT(*) via Index Only
  // Scan on idx_products_displayable (~5ms). The planner's estimated count
  // was off (~2400 vs 11500 actual) which truncated the sitemap-index to
  // a single page and starved Google of 6500+ product URLs.
  const rpcResult = (await supabaseServer.rpc('count_displayable_products')) as {
    data: number | null;
    error: { message: string } | null;
  };
  if (!rpcResult.error && rpcResult.data != null) {
    return Number(rpcResult.data);
  }

  // Fallback to estimated count if RPC fails (graceful degradation).
  const { count, error } = await supabaseServer
    .from('products')
    .select('id', { count: 'estimated', head: true })
    .eq('is_active', true)
    .eq('is_vendable', true)
    .not('slug', 'is', null)
    .not('image_url', 'is', null);
  if (error) throw new Error(`countVendableProducts: ${error.message}`);
  return count ?? 0;
}

export async function fetchVendableProductsForSitemap(
  page: number,
  pageSize: number = SITEMAP_PRODUCTS_PER_PAGE,
): Promise<SitemapEntry[]> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await supabaseServer
    .from('products')
    .select('slug,updated_at,image_url')
    .eq('is_active', true)
    .eq('is_vendable', true)
    .not('slug', 'is', null)
    .not('image_url', 'is', null)
    .order('id', { ascending: true })
    .range(from, to);
  if (error) throw new Error(`fetchVendableProductsForSitemap: ${error.message}`);
  const rows = (data ?? []) as Array<{
    slug: string | null;
    updated_at: string | null;
    image_url: string | null;
  }>;
  return rows
    .filter(
      (row): row is { slug: string; updated_at: string; image_url: string | null } =>
        typeof row.slug === 'string' && row.slug.length > 0 && typeof row.updated_at === 'string',
    )
    .map((row) => ({
      slug: row.slug,
      updated_at: row.updated_at,
      image_url: row.image_url,
    }));
}

export async function fetchSitemapCategories(): Promise<SitemapEntry[]> {
  // Surface only the ~50 seeded categories (those with a precalibrated
  // coefficient in pricing_category_coefficients). The other 444 categories
  // either have zero publishable products or fall back to __default__ and
  // are not strategic enough to index.
  // pricing_category_coefficients n'est pas dans Database.Tables (hors
  // scope V1 type gen). Cast explicite.
  const { data: seeded, error: seedError } = (await supabaseServer
    .from('pricing_category_coefficients')
    .select('category')
    .neq('category', '__default__')) as {
    data: Array<{ category: string | null }> | null;
    error: { message: string } | null;
  };
  if (seedError) throw new Error(`fetchSitemapCategories (seed): ${seedError.message}`);

  const names = (seeded ?? [])
    .map((r) => r.category)
    .filter((n): n is string => typeof n === 'string' && n.length > 0);
  if (names.length === 0) return [];

  const { data, error } = await supabaseServer
    .from('categories')
    .select('slug,updated_at')
    .in('name', names)
    .eq('is_active', true);
  if (error) throw new Error(`fetchSitemapCategories (join): ${error.message}`);

  const rows = (data ?? []) as Array<{ slug: string | null; updated_at: string | null }>;
  return rows.filter(
    (row): row is SitemapEntry =>
      typeof row.slug === 'string' && row.slug.length > 0 && typeof row.updated_at === 'string',
  );
}

export async function fetchCategoryBySlug(slug: string): Promise<Category | null> {
  const { data, error } = await supabaseServer
    .from('categories')
    .select(
      'id,name,slug,level,parent_id,description,image_url,sort_order,is_active,created_at,updated_at',
    )
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new Error(`fetchCategoryBySlug: ${error.message}`);
  return (data ?? null) as Category | null;
}

export async function fetchSubcategories(parentId: string): Promise<Category[]> {
  const { data, error } = await supabaseServer
    .from('categories')
    .select(
      'id,name,slug,level,parent_id,description,image_url,sort_order,is_active,created_at,updated_at',
    )
    .eq('parent_id', parentId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`fetchSubcategories: ${error.message}`);
  return (data ?? []) as Category[];
}

export async function fetchDistinctCategoryNames(): Promise<string[]> {
  const { data, error } = await supabaseServer.rpc('get_public_product_categories');
  if (error) throw new Error(`fetchDistinctCategoryNames: ${error.message}`);
  return ((data ?? []) as string[]).filter(Boolean);
}

export async function fetchDistinctBrands(): Promise<string[]> {
  const { data, error } = await supabaseServer.rpc('get_public_product_brands');
  if (error) throw new Error(`fetchDistinctBrands: ${error.message}`);
  return ((data ?? []) as string[]).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Display helpers (used by ProductCard + ProductDetail)
// ---------------------------------------------------------------------------

export type StockState = 'in_stock' | 'low_stock' | 'out_of_stock';

export function getStockState(
  product: Pick<Product, 'stock_quantity' | 'stock_online' | 'available_qty_total'>,
): StockState {
  // Stock dual (V2.1) : on lit stock_online en priorité (vraie source pour
  // le canal e-commerce). Le trigger compat garantit stock_quantity ===
  // stock_online en DB, donc le fallback ne change rien fonctionnellement
  // — il sert uniquement le temps qu'un appelant qui ne sélectionne pas
  // encore stock_online soit migré (les Pick<…> ci-dessous nous protègent
  // du oubli silencieux côté types).
  const qty = Math.max(
    product.stock_online ?? product.stock_quantity ?? 0,
    product.available_qty_total ?? 0,
  );
  if (qty <= 0) return 'out_of_stock';
  if (qty < 5) return 'low_stock';
  return 'in_stock';
}

// Thin wrapper that delegates to `lib/pricing.ts`. Callers that have already
// loaded the coefficient map should call `computeDisplayPrice` directly and
// avoid re-fetching; this helper is for one-off renders that can tolerate the
// fallback coefficient (used when no coef map is provided).
export function getDisplayPrices(
  product: Pick<
    Product,
    'category' | 'cost_price' | 'manual_price_ht' | 'price_ttc' | 'public_price_ttc'
  >,
  coefs?: PricingCoefficientMap,
): { ht: number; ttc: number; vatRate: number } {
  const { ht, ttc, vatRate } = computeDisplayPrice(product, coefs ?? new Map());
  return { ht, ttc, vatRate };
}

export function productHref(product: Pick<Product, 'slug' | 'id'>): string {
  if (!product.slug) throw new Error(`productHref: product ${product.id} has no slug`);
  return `/produit/${product.slug}`;
}

export function productImage(product: Pick<Product, 'image_url' | 'name'>): string {
  return product.image_url ?? '/placeholder-product.svg';
}
