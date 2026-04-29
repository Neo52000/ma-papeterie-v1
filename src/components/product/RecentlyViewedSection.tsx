import { useEffect, useState } from 'react';
import { useRecentlyViewedStore } from '@/stores/recentlyViewedStore';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { cdnImage } from '@/lib/cdn-image';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/types/database';

// Mirror of pricing.ts logic — re-implemented locally to avoid pulling the
// server-only `supabase.ts` import (and its service-role key) into the
// browser bundle. Coefficient map isn't available client-side, so we use
// the same fallback path as `getDisplayPrices(...)` with an empty map.
const VAT_RATE = 0.2;
const FALLBACK_COEF = 1.7;
const SENTINEL_THRESHOLD = 0.05;

function computeBrowserTtc(
  product: Pick<Product, 'cost_price' | 'manual_price_ht' | 'price_ttc' | 'public_price_ttc'>,
): number {
  if (product.manual_price_ht != null && Number(product.manual_price_ht) >= SENTINEL_THRESHOLD) {
    return Number(product.manual_price_ht) * (1 + VAT_RATE);
  }
  if (product.cost_price != null && Number(product.cost_price) >= SENTINEL_THRESHOLD) {
    return Number(product.cost_price) * FALLBACK_COEF;
  }
  if (product.public_price_ttc != null && Number(product.public_price_ttc) >= SENTINEL_THRESHOLD) {
    return Number(product.public_price_ttc);
  }
  if (product.price_ttc != null && Number(product.price_ttc) >= SENTINEL_THRESHOLD) {
    return Number(product.price_ttc);
  }
  return 0;
}

interface Props {
  currentProductId: string;
}

type RecentProduct = Pick<
  Product,
  | 'id'
  | 'name'
  | 'slug'
  | 'brand'
  | 'image_url'
  | 'cost_price'
  | 'manual_price_ht'
  | 'price_ttc'
  | 'public_price_ttc'
>;

const SELECT_COLUMNS =
  'id, name, slug, brand, image_url, cost_price, manual_price_ht, price_ttc, public_price_ttc';

export default function RecentlyViewedSection({ currentProductId }: Props) {
  const ids = useRecentlyViewedStore((s) => s.getRecentExcept(currentProductId));
  const [products, setProducts] = useState<RecentProduct[]>([]);

  // Reorder fetched rows to match the recency order from the store and cap to 4.
  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    const targetIds = ids.slice(0, 4);
    void supabaseBrowser
      .from('products')
      .select(SELECT_COLUMNS)
      .in('id', targetIds)
      .returns<RecentProduct[]>()
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const byId = new Map(data.map((p) => [p.id, p]));
        const ordered = targetIds
          .map((id) => byId.get(id))
          .filter((p): p is RecentProduct => Boolean(p && p.slug));
        setProducts(ordered);
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  if (products.length === 0) return null;

  return (
    <aside className="mt-16">
      <h2 className="font-display text-2xl font-semibold text-primary">Vus récemment</h2>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {products.map((product) => {
          const ttc = computeBrowserTtc(product);
          const href = `/produit/${product.slug}`;
          const imageSrc = cdnImage(product.image_url ?? '/placeholder-product.svg', {
            width: 300,
          });
          return (
            <article key={product.id} className="card-product group flex h-full flex-col">
              <a href={href} className="block" aria-label={`Voir la fiche ${product.name}`}>
                <div className="relative aspect-square w-full overflow-hidden bg-bg-soft">
                  <img
                    src={imageSrc}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                </div>
              </a>
              <div className="flex flex-1 flex-col gap-2 p-4">
                {product.brand && <span className="label-category">{product.brand}</span>}
                <h3 className="line-clamp-2 text-sm font-semibold text-primary">
                  <a href={href} className="hover:text-accent">
                    {product.name}
                  </a>
                </h3>
                <div className="mt-auto pt-2 font-display text-base font-semibold text-primary">
                  {formatPrice(ttc, { mode: 'TTC', vatRate: 0 })}
                  <span className="text-xs font-normal text-primary/60"> TTC</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}
