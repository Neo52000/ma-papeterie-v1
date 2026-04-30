import { useEffect, useState } from 'react';
import { cdnImage } from '@/lib/cdn-image';

interface SemanticItem {
  id: string;
  name: string;
  slug: string | null;
  brand: string | null;
  image_url: string | null;
  price_ttc: number | null;
  price: number | null;
  similarity: number;
}

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

export interface SemanticSuggestionsProps {
  query: string;
}

// Fallback affiché en empty state catalogue : appelle /api/products/search-semantic
// pour proposer des produits proches sémantiquement de la requête. Hidden si
// 0 résultat ou OPENAI_API_KEY absent.

export default function SemanticSuggestions({ query }: SemanticSuggestionsProps) {
  const [items, setItems] = useState<SemanticItem[] | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (query.trim().length < 3) {
      setHidden(true);
      return;
    }
    let cancelled = false;
    void fetch(`/api/products/search-semantic?q=${encodeURIComponent(query)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setHidden(true);
          return;
        }
        const json = (await res.json()) as { items: SemanticItem[]; reason?: string };
        if (json.reason === 'no_openai_key' || json.items.length === 0) {
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
  }, [query]);

  if (hidden) return null;
  if (items === null) {
    return <p className="mt-8 text-center text-sm text-primary/50">Recherche IA en cours…</p>;
  }

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold text-primary">
        🤖 Suggestions IA — proches de votre recherche
      </h2>
      <p className="mt-1 text-xs text-primary/50">
        Recherche sémantique (sens + synonymes), pas de match exact.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((p) => {
          const price = p.price_ttc ?? p.price ?? 0;
          const href = p.slug ? `/produit/${p.slug}` : '#';
          return (
            <article key={p.id} className="card-product group flex h-full flex-col">
              <div className="relative aspect-square w-full overflow-hidden bg-bg-soft">
                <a href={href} aria-label={`Voir ${p.name}`} className="block h-full w-full">
                  {p.image_url ? (
                    <img
                      src={cdnImage(p.image_url, { width: 300 })}
                      alt={p.name}
                      width={300}
                      height={300}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                  ) : null}
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
                  {eur.format(price)}{' '}
                  <span className="text-xs font-normal text-primary/60">TTC</span>
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
