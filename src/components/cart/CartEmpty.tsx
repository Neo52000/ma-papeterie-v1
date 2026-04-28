interface CartEmptyProps {
  onClose: () => void;
}

export default function CartEmpty({ onClose }: CartEmptyProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="56"
        height="56"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary/60"
        aria-hidden="true"
      >
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
      <p className="text-base font-medium text-primary">Votre panier est vide</p>
      <p className="text-sm text-primary/60">
        Parcourez le catalogue pour ajouter des produits à votre panier.
      </p>
      <a
        href="/catalogue"
        onClick={onClose}
        className="mt-2 inline-flex h-11 items-center justify-center rounded-btn bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        Voir le catalogue
      </a>
    </div>
  );
}
