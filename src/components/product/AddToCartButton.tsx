import { useEffect, useState } from 'react';
import { useCartStore, type CartItem } from '@/stores/cartStore';
import { Button } from '@/components/ui/Button';

export interface AddToCartButtonProps {
  productId: string;
  title: string;
  priceTTC: number;
  image?: string;
  disabled?: boolean;
  maxQuantity?: number;
}

// F4 (checkout) will replace `variantId` with the real Shopify GID returned
// by the Storefront API. Until Phase 3 unlocks the Shopify channel we key
// cart lines on `productId` so the client cart can still be tested.
export default function AddToCartButton({
  productId,
  title,
  priceTTC,
  image,
  disabled = false,
  maxQuantity,
}: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<'idle' | 'added'>('idle');
  const addItem = useCartStore((s) => s.addItem);

  // Revert to idle ~1.6 s after a successful add. `useEffect` guarantees the
  // timer is cancelled if the component unmounts before it fires (no setState
  // on unmounted component warning).
  useEffect(() => {
    if (status !== 'added') return;
    const timer = window.setTimeout(() => setStatus('idle'), 1600);
    return () => window.clearTimeout(timer);
  }, [status]);

  const bump = (delta: number) => {
    setQuantity((q) => {
      const next = q + delta;
      if (next < 1) return 1;
      if (maxQuantity && next > maxQuantity) return maxQuantity;
      return next;
    });
  };

  const handleAdd = () => {
    const item: CartItem = {
      variantId: productId,
      productId,
      title,
      quantity,
      priceTTC,
      image,
    };
    addItem(item);
    setStatus('added');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center rounded-btn border border-primary/15">
          <button
            type="button"
            onClick={() => bump(-1)}
            disabled={disabled || quantity <= 1}
            aria-label="Diminuer la quantité"
            className="h-11 w-11 text-lg font-semibold text-primary hover:bg-bg-soft disabled:opacity-40"
          >
            −
          </button>
          <span
            className="min-w-[2rem] text-center text-sm font-medium text-primary"
            aria-live="polite"
          >
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => bump(1)}
            disabled={disabled || (maxQuantity != null && quantity >= maxQuantity)}
            aria-label="Augmenter la quantité"
            className="h-11 w-11 text-lg font-semibold text-primary hover:bg-bg-soft disabled:opacity-40"
          >
            +
          </button>
        </div>

        <Button
          variant="accent"
          size="lg"
          onClick={handleAdd}
          disabled={disabled}
          className="flex-1"
        >
          {disabled ? 'Indisponible' : status === 'added' ? 'Ajouté ✓' : 'Ajouter au panier'}
        </Button>
      </div>
      {maxQuantity != null && (
        <p className="text-xs text-primary/60">Stock disponible&nbsp;: {maxQuantity}</p>
      )}
    </div>
  );
}
