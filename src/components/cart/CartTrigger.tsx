import { useCartHydrated, useCartItemsCount, useCartStore } from '@/stores/cartStore';

export default function CartTrigger() {
  const openDrawer = useCartStore((s) => s.openDrawer);
  const hydrated = useCartHydrated();
  const count = useCartItemsCount();

  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={
        hydrated && count > 0 ? `Panier — ${count} article${count > 1 ? 's' : ''}` : 'Panier'
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
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
      {hydrated && count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-white"
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </button>
  );
}
