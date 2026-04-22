import { useEffect, useState } from 'react';
import { useCartStore } from '@/stores/cartStore';

export default function CartCount() {
  const [mounted, setMounted] = useState(false);
  const count = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));

  // Avoid hydration mismatch: Zustand restores localStorage client-side only.
  useEffect(() => setMounted(true), []);
  if (!mounted || count === 0) return null;

  return (
    <span
      aria-label={`${count} article${count > 1 ? 's' : ''} dans le panier`}
      className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1 text-[0.65rem] font-semibold text-white"
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
