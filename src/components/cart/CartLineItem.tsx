import { useCartStore, type CartLine } from '@/stores/cartStore';
import { toast } from '@/stores/toastStore';

interface CartLineItemProps {
  line: CartLine;
}

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

export default function CartLineItem({ line }: CartLineItemProps) {
  const updateLineQuantity = useCartStore((s) => s.updateLineQuantity);
  const removeLine = useCartStore((s) => s.removeLine);
  const isLoading = useCartStore((s) => s.isLoading);

  const lineTotalTtc = line.unitPriceTtc * line.quantity;

  return (
    <div className="flex gap-3 border-b border-primary/10 py-4">
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-btn bg-bg-soft">
        {line.imageUrl ? (
          <img src={line.imageUrl} alt="" loading="lazy" className="h-full w-full object-contain" />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 text-sm">
        <a
          href={`/produit/${line.productSlug}`}
          className="line-clamp-2 font-medium text-primary hover:text-accent"
        >
          {line.productName}
        </a>
        {line.brand ? <p className="text-xs text-primary/60">{line.brand}</p> : null}
        <p className="font-semibold text-primary">
          {eur.format(lineTotalTtc)}
          <span className="price-ht-suffix">TTC</span>
        </p>
      </div>

      <div className="flex flex-col items-end justify-between">
        <button
          type="button"
          onClick={async () => {
            try {
              await removeLine(line.variantId);
              toast.success(`${line.productName} retiré du panier`);
            } catch {
              toast.error('Impossible de retirer cet article. Réessayez.');
            }
          }}
          disabled={isLoading}
          aria-label={`Retirer ${line.productName} du panier`}
          className="text-xs text-primary/50 hover:text-accent disabled:opacity-40"
        >
          Retirer
        </button>
        <div className="inline-flex items-center rounded-btn border border-primary/15">
          <button
            type="button"
            onClick={() => updateLineQuantity(line.variantId, line.quantity - 1)}
            disabled={isLoading || line.quantity <= 1}
            aria-label="Diminuer la quantité"
            className="h-8 w-8 text-sm font-semibold text-primary hover:bg-bg-soft disabled:opacity-40"
          >
            −
          </button>
          <span
            className="min-w-[1.75rem] text-center text-sm font-medium text-primary"
            aria-live="polite"
          >
            {line.quantity}
          </span>
          <button
            type="button"
            onClick={() => updateLineQuantity(line.variantId, line.quantity + 1)}
            disabled={isLoading}
            aria-label="Augmenter la quantité"
            className="h-8 w-8 text-sm font-semibold text-primary hover:bg-bg-soft disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
