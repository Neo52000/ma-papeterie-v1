import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useWishlistStore } from '@/stores/wishlistStore';
import { cdnImage } from '@/lib/cdn-image';

interface ProductRow {
  id: string;
  slug: string | null;
  name: string;
  brand: string | null;
  image_url: string | null;
  price_ttc: number | null;
  price: number | null;
}

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

export default function WishlistList() {
  const productIds = useWishlistStore((s) => s.productIds);
  const hasLoaded = useWishlistStore((s) => s.hasLoaded);
  const toggle = useWishlistStore((s) => s.toggle);
  const [products, setProducts] = useState<ProductRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    void supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!data.session) setIsGuest(true);
    });
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    const ids = Array.from(productIds);
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabaseBrowser
        .from('products')
        .select('id,slug,name,brand,image_url,price_ttc,price')
        .in('id', ids);
      if (cancelled) return;
      if (error) {
        setError(error.message);
        return;
      }
      setProducts((data ?? []) as ProductRow[]);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [hasLoaded, productIds]);

  if (isGuest) {
    return (
      <div className="rounded-card bg-bg-soft p-6 text-center">
        <p className="text-sm text-primary">Connectez-vous pour retrouver vos favoris.</p>
        <a
          href={`/connexion?next=${encodeURIComponent('/compte/favoris')}`}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-btn bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Se connecter
        </a>
      </div>
    );
  }

  if (!hasLoaded) {
    return <p className="py-6 text-center text-sm text-primary/60">Chargement des favoris…</p>;
  }

  if (error) {
    return (
      <p className="py-6 text-center text-sm text-accent">
        Impossible de charger les favoris ({error}).
      </p>
    );
  }

  if (products == null) {
    return <p className="py-6 text-center text-sm text-primary/60">Chargement…</p>;
  }

  // Detect orphan favourites: a product_id in the user's wishlist that no
  // longer matches any row in `products` (deleted, soft-removed, or hidden
  // by RLS for some reason). Without this, those rows silently disappeared
  // — the user couldn't see why their favourites count looked wrong and
  // had no way to remove the dangling entries.
  const fetchedIds = new Set(products.map((p) => p.id));
  const orphanIds = Array.from(productIds).filter((id) => !fetchedIds.has(id));

  if (products.length === 0 && orphanIds.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-primary/70">
        Aucun favori pour l'instant.{' '}
        <a href="/catalogue" className="text-accent hover:text-accent-hover">
          Parcourir le catalogue
        </a>
        .
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {products.map((p) => {
        const price = p.price_ttc ?? p.price ?? 0;
        const href = p.slug ? `/produit/${p.slug}` : '#';
        return (
          <li key={p.id} className="flex gap-3 rounded-card border border-primary/10 bg-white p-3">
            <a
              href={href}
              className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-btn bg-bg-soft"
            >
              {p.image_url ? (
                <img
                  src={cdnImage(p.image_url, { width: 160 })}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain"
                />
              ) : null}
            </a>
            <div className="flex flex-1 flex-col text-sm">
              <a href={href} className="line-clamp-2 font-medium text-primary hover:text-accent">
                {p.name}
              </a>
              {p.brand ? <p className="text-xs text-primary/60">{p.brand}</p> : null}
              <p className="mt-auto text-sm font-semibold text-primary">{eur.format(price)} TTC</p>
            </div>
            <button
              type="button"
              onClick={() => void toggle(p.id, p.name)}
              aria-label={`Retirer ${p.name} des favoris`}
              className="self-start text-xs text-primary/50 hover:text-accent"
            >
              Retirer
            </button>
          </li>
        );
      })}
      {orphanIds.map((id) => (
        <li
          key={id}
          className="flex gap-3 rounded-card border border-primary/10 bg-bg-soft p-3 opacity-80"
        >
          <div
            className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-btn bg-primary/5 text-primary/30"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="m3 21 18-18" />
            </svg>
          </div>
          <div className="flex flex-1 flex-col text-sm">
            <p className="font-medium text-primary/70">Produit non disponible</p>
            <p className="text-xs text-primary/50">
              Ce produit a été retiré du catalogue. Retirez-le de vos favoris.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void toggle(id, '')}
            aria-label="Retirer ce favori non disponible"
            className="self-start text-xs text-primary/50 hover:text-accent"
          >
            Retirer
          </button>
        </li>
      ))}
    </ul>
  );
}
