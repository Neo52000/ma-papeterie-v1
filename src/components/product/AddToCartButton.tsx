import { useEffect, useState } from 'react';
import { useCartStore, type CartLine } from '@/stores/cartStore';
import { Button } from '@/components/ui/Button';
import { toast } from '@/stores/toastStore';

export interface AddToCartButtonProps {
  variantId: string;
  productSupabaseId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  brand: string | null;
  unitPriceTtc: number;
  unitPriceHt: number;
  compareAtTtc: number | null;
  disabled?: boolean;
  maxQuantity?: number;
}

export default function AddToCartButton({
  variantId,
  productSupabaseId,
  productName,
  productSlug,
  imageUrl,
  brand,
  unitPriceTtc,
  unitPriceHt,
  compareAtTtc,
  disabled = false,
  maxQuantity,
}: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<'idle' | 'added'>('idle');
  const addLine = useCartStore((s) => s.addLine);
  const openDrawer = useCartStore((s) => s.openDrawer);

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

  const handleAdd = async () => {
    const line: Omit<CartLine, 'quantity' | 'lineId'> = {
      variantId,
      productSupabaseId,
      productName,
      productSlug,
      imageUrl,
      brand,
      unitPriceTtc,
      unitPriceHt,
      compareAtTtc,
    };
    try {
      await addLine(line, quantity);
      openDrawer();
      setStatus('added');
      toast.success(
        quantity > 1 ? `${quantity} × ${productName} ajoutés` : `${productName} ajouté au panier`,
      );
    } catch {
      toast.error("Impossible d'ajouter au panier. Réessayez.");
    }
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
