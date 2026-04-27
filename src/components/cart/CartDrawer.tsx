import { useEffect, useRef } from 'react';
import { useCartStore } from '@/stores/cartStore';
import CartEmpty from './CartEmpty';
import CartLineItem from './CartLineItem';
import CartSummary from './CartSummary';

export default function CartDrawer() {
  const isOpen = useCartStore((s) => s.isOpen);
  const closeDrawer = useCartStore((s) => s.closeDrawer);
  const lines = useCartStore((s) => s.lines);
  const error = useCartStore((s) => s.error);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close on ESC + lock body scroll while open + initial focus on close button.
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, closeDrawer]);

  // Render nothing in the DOM when closed — keeps the SSR output clean
  // and avoids any z-index / overlay artefacts on the first paint.
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      <button
        type="button"
        aria-label="Fermer le panier"
        onClick={closeDrawer}
        className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
      />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-card-hover">
        <header className="flex items-center justify-between border-b border-primary/10 p-4">
          <h2 id="cart-drawer-title" className="font-display text-lg font-semibold text-primary">
            Votre panier
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeDrawer}
            aria-label="Fermer le panier"
            className="inline-flex h-9 w-9 items-center justify-center rounded-btn text-primary hover:bg-bg-soft"
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
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        {error ? (
          <div className="border-b border-accent/30 bg-accent/10 px-4 py-2 text-xs text-accent">
            {error}
          </div>
        ) : null}

        {lines.length === 0 ? (
          <CartEmpty onClose={closeDrawer} />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4">
              {lines.map((line) => (
                <CartLineItem key={line.variantId} line={line} />
              ))}
            </div>
            <CartSummary />
          </>
        )}
      </aside>
    </div>
  );
}
