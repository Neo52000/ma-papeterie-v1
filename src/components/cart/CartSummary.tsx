import { useCartStore, useCartSubtotalHt, useCartSubtotalTtc } from '@/stores/cartStore';

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

export default function CartSummary() {
  const subtotalHt = useCartSubtotalHt();
  const subtotalTtc = useCartSubtotalTtc();
  const checkoutUrl = useCartStore((s) => s.checkoutUrl);
  const isLoading = useCartStore((s) => s.isLoading);

  const handleCheckout = () => {
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    }
  };

  return (
    <div className="border-t border-primary/10 bg-white p-4">
      <dl className="mb-4 space-y-1 text-sm">
        <div className="flex justify-between text-primary/70">
          <dt>Sous-total HT</dt>
          <dd>{eur.format(subtotalHt)}</dd>
        </div>
        <div className="flex justify-between text-base font-semibold text-primary">
          <dt>Sous-total TTC</dt>
          <dd>{eur.format(subtotalTtc)}</dd>
        </div>
        <p className="text-xs text-primary/50">Frais de livraison calculés au paiement.</p>
      </dl>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={isLoading || !checkoutUrl}
        className="inline-flex h-12 w-full items-center justify-center rounded-btn bg-accent px-6 text-base font-medium text-white transition-colors hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50"
      >
        {isLoading ? 'Mise à jour…' : 'Passer au paiement'}
      </button>
      {!isLoading && !checkoutUrl ? (
        <p role="alert" className="mt-2 text-center text-xs text-accent">
          Lien de paiement indisponible. Rechargez la page ou réessayez dans quelques secondes.
        </p>
      ) : null}
    </div>
  );
}
