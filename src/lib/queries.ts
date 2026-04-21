import { supabaseServer } from '@/lib/supabase';
import type { Category, Product, ProductImage } from '@/types/database';

// ---------------------------------------------------------------------------
// Public catalogue — read through `public.products` + `product_images`.
// All queries filter on `is_active` + `is_vendable` so a product that is
// flagged as end-of-life / hidden cannot leak to the public site.
// ---------------------------------------------------------------------------

export const CATALOGUE_PAGE_SIZE = 24;

export type SortKey = 'pertinence' | 'price-asc' | 'price-desc' | 'newest';

export interface CatalogueFilters {
  category?: string;
  brand?: string;
  priceMax?: number;
  inStockOnly?: boolean;
  search?: string;
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

const PUBLIC_PRODUCT_COLUMNS =
  'id,name,slug,description,brand,category,subcategory,ean,price,price_ht,price_ttc,public_price_ttc,tva_rate,stock_quantity,available_qty_total,is_available,image_url,badge,is_featured,created_at,updated_at';

type Filterable = { eq: (col: string, val: unknown) => Filterable };

function applyPublicFilters<T>(query: T): T {
  const q = query as unknown as Filterable;
  return q.eq('is_active', true).eq('is_vendable', true) as unknown as T;
}

export async function fetchCatalogue(opts: CatalogueQuery = {}): Promise<CatalogueResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = CATALOGUE_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseServer
    .from('products')
    .select(PUBLIC_PRODUCT_COLUMNS, { count: 'exact' });

  query = applyPublicFilters(query);
  // Slug is the public URL primary key; hide slug-less products until the
  // Comlandi sync backfills them (cf. PHASE-2-SCHEMA-REPORT §Recommandations).
  query = query.not('slug', 'is', null);

  if (opts.category) {
    query = query.eq('category', opts.category);
  }
  if (opts.brand) {
    query = query.eq('brand', opts.brand);
  }
  if (typeof opts.priceMax === 'number' && Number.isFinite(opts.priceMax)) {
    query = query.lte('price_ttc', opts.priceMax);
  }
  if (opts.inStockOnly) {
    query = query.gt('stock_quantity', 0);
  }
  if (opts.search && opts.search.trim().length >= 2) {
    // Full-text search via the Phase 2 `search_vector` column + GIN index.
    // `plainto_tsquery` on the French dictionary mirrors the weighting defined
    // in supabase/migrations/20260421000000_products_search_vector.sql.
    query = query.textSearch('search_vector', opts.search.trim(), {
      config: 'french',
      type: 'plain',
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

  const total = count ?? 0;
  return {
    items: (data ?? []) as Product[],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  let query = supabaseServer
    .from('products')
    .select(PUBLIC_PRODUCT_COLUMNS)
    .eq('slug', slug)
    .limit(1);
  query = applyPublicFilters(query);
  const { data, error } = await query.maybeSingle();
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
  let query = supabaseServer
    .from('products')
    .select(PUBLIC_PRODUCT_COLUMNS)
    .eq('category', category)
    .neq('id', productId)
    .limit(limit);
  query = applyPublicFilters(query);
  const { data, error } = await query;
  if (error) throw new Error(`fetchRelatedProducts: ${error.message}`);
  return (data ?? []) as Product[];
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function fetchRootCategories(limit = 6): Promise<Category[]> {
  const { data, error } = await supabaseServer
    .from('categories')
    .select('id,name,slug,level,parent_id,description,image_url,sort_order,is_active,created_at,updated_at')
    .eq('is_active', true)
    .is('parent_id', null)
    .order('sort_order', { ascending: true })
    .limit(limit);
  if (error) throw new Error(`fetchRootCategories: ${error.message}`);
  return (data ?? []) as Category[];
}

export async function fetchDistinctCategoryNames(limit = 40): Promise<string[]> {
  // `category` is a free-text column on `products`. Distinct names come from
  // the 34k vendable subset. Cheap enough as the index is selective.
  const { data, error } = await supabaseServer
    .from('products')
    .select('category')
    .eq('is_active', true)
    .eq('is_vendable', true)
    .not('category', 'is', null)
    .limit(5000);
  if (error) throw new Error(`fetchDistinctCategoryNames: ${error.message}`);
  const seen = new Set<string>();
  for (const row of data ?? []) {
    const value = (row as { category: string | null }).category;
    if (value) seen.add(value);
    if (seen.size >= limit) break;
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b, 'fr'));
}

export async function fetchDistinctBrands(limit = 40): Promise<string[]> {
  const { data, error } = await supabaseServer
    .from('products')
    .select('brand')
    .eq('is_active', true)
    .eq('is_vendable', true)
    .not('brand', 'is', null)
    .limit(5000);
  if (error) throw new Error(`fetchDistinctBrands: ${error.message}`);
  const seen = new Set<string>();
  for (const row of data ?? []) {
    const value = (row as { brand: string | null }).brand;
    if (value) seen.add(value);
    if (seen.size >= limit) break;
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b, 'fr'));
}

// ---------------------------------------------------------------------------
// Display helpers (used by ProductCard + ProductDetail)
// ---------------------------------------------------------------------------

export type StockState = 'in_stock' | 'low_stock' | 'out_of_stock';

export function getStockState(product: Pick<Product, 'stock_quantity' | 'available_qty_total'>): StockState {
  const qty = Math.max(product.stock_quantity ?? 0, product.available_qty_total ?? 0);
  if (qty <= 0) return 'out_of_stock';
  if (qty < 5) return 'low_stock';
  return 'in_stock';
}

export function getDisplayPrices(product: Pick<Product, 'price' | 'price_ht' | 'price_ttc' | 'public_price_ttc' | 'tva_rate'>): {
  ht: number;
  ttc: number;
  vatRate: number;
} {
  const vatRate = (product.tva_rate ?? 20) / 100;
  const ttc =
    product.price_ttc ??
    product.public_price_ttc ??
    (product.price_ht != null ? product.price_ht * (1 + vatRate) : product.price);
  const ht = product.price_ht ?? product.price ?? ttc / (1 + vatRate);
  return { ht, ttc, vatRate };
}

export function productHref(product: Pick<Product, 'slug' | 'id'>): string {
  if (!product.slug) throw new Error(`productHref: product ${product.id} has no slug`);
  return `/produit/${product.slug}`;
}

export function productImage(product: Pick<Product, 'image_url' | 'name'>): string {
  return product.image_url ?? '/placeholder-product.svg';
}
