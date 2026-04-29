import { useEffect, useState } from 'react';
import { useWishlistStore } from '@/stores/wishlistStore';
import { supabaseBrowser } from '@/lib/supabase-browser';

// Heart icon link to /compte/favoris with a count badge once the user is
// authenticated. Hidden for guests — discovering favorites is initiated from
// product cards (where the heart is contextual), not the header chrome.

export default function WishlistTrigger() {
  const count = useWishlistStore((s) => s.productIds.size);
  const hasLoaded = useWishlistStore((s) => s.hasLoaded);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    void supabaseBrowser.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isLoggedIn) return null;

  return (
    <a
      href="/compte/favoris"
      aria-label={
        hasLoaded && count > 0 ? `Favoris — ${count} produit${count > 1 ? 's' : ''}` : 'Favoris'
      }
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-btn text-primary hover:bg-bg-soft"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
      </svg>
      {hasLoaded && count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-white"
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </a>
  );
}
