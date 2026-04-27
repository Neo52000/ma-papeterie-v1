import { useCartHydrated, useCartItemsCount } from '@/stores/cartStore';

export default function CartCount() {
  const hydrated = useCartHydrated();
  const count = useCartItemsCount();

  if (!hydrated || count === 0) return null;

  return (
    <span
      aria-label={`${count} article${count > 1 ? 's' : ''} dans le panier`}
      className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1 text-[0.65rem] font-semibold text-white"
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
