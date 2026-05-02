import { useEffect, useState } from 'react';
import { cdnImage } from '@/lib/cdn-image';

interface SimilarProduct {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  category: string | null;
  image_url: string;
  // displayTtc is computed server-side via the V1 pricing cascade. The card
  // never reads price_ttc/price directly — those columns include supplier
  // sentinel values (0,02 €) on a chunk of the catalogue.
  displayTtc: number;
  similarity: number;
}

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

export interface SimilarProductsAIProps {
  productId: string;
}

// Fetches AI-driven similar products (pgvector cosine similarity on
// OpenAI embeddings). Returns null silently if no results — the page can
// keep showing the category-based fallback section above.

export default function SimilarProductsAI({ productId }: SimilarProductsAIProps) {
  const [items, setItems] = useState<SimilarProduct[] | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/products/${productId}/similar`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setHidden(true);
          return;
        }
        const json = (await res.json()) as { items: SimilarProduct[] };
        if (!json.items || json.items.length === 0) {
          setHidden(true);
          return;
        }
        setItems(json.items);
      })
      .catch(() => {
        if (!cancelled) setHidden(true);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (hidden) return null;
  if (items === null) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card-product flex h-full animate-pulse flex-col bg-white">
            <div className="aspect-square w-full bg-bg-soft" />
            <div className="flex flex-1 flex-col gap-2 p-4">
              <div className="h-3 w-1/4 rounded bg-bg-soft" />
              <div className="h-4 w-3/4 rounded bg-bg-soft" />
              <div className="h-4 w-1/3 rounded bg-bg-soft" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((p) => {
        const href = `/produit/${p.slug}`;
        return (
          <article key={p.id} className="card-product group flex h-full flex-col">
            <div className="relative aspect-square w-full overflow-hidden bg-bg-soft">
              <a href={href} aria-label={`Voir ${p.name}`} className="block h-full w-full">
                <img
                  src={cdnImage(p.image_url, { width: 300 })}
                  alt={p.name}
                  width={300}
                  height={300}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.03]"
                />
              </a>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              {p.brand && <span className="label-category">{p.brand}</span>}
              <h3 className="line-clamp-2 text-sm font-semibold text-primary">
                <a href={href} className="hover:text-accent">
                  {p.name}
                </a>
              </h3>
              <p className="mt-auto text-sm font-semibold text-primary">
                {eur.format(p.displayTtc)}{' '}
                <span className="text-xs font-normal text-primary/60">TTC</span>
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
