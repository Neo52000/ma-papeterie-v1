import { useWishlistStore } from '@/stores/wishlistStore';

export interface WishlistButtonProps {
  productId: string;
  productName: string;
  /** "icon" = small heart on cards, "full" = button with label on detail page. */
  variant?: 'icon' | 'full';
}

export default function WishlistButton({
  productId,
  productName,
  variant = 'icon',
}: WishlistButtonProps) {
  const isSaved = useWishlistStore((s) => s.productIds.has(productId));
  const pending = useWishlistStore((s) => s.pending === productId);
  const toggle = useWishlistStore((s) => s.toggle);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void toggle(productId, productName);
  };

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={isSaved}
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-btn border px-4 text-sm font-medium transition-colors disabled:opacity-50 ${
          isSaved
            ? 'border-accent bg-accent/10 text-accent hover:bg-accent/20'
            : 'border-primary/15 bg-white text-primary hover:border-accent hover:text-accent'
        }`}
      >
        <Heart filled={isSaved} />
        {isSaved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={isSaved}
      aria-label={
        isSaved ? `Retirer ${productName} des favoris` : `Ajouter ${productName} aux favoris`
      }
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-card transition-colors hover:bg-white disabled:opacity-50 ${
        isSaved ? 'text-accent' : 'text-primary/60 hover:text-accent'
      }`}
    >
      <Heart filled={isSaved} />
    </button>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
    </svg>
  );
}
