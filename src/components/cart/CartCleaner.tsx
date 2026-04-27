import { useEffect } from 'react';
import { useCartStore } from '@/stores/cartStore';

// Clears the local cart store when mounted. Used on /merci so that a user
// who completed Shopify checkout doesn't see the now-stale cartId / lines
// when they return to the site (the Shopify cart is consumed and any
// further cartLinesAdd on it would error out).
export default function CartCleaner() {
  const clearCart = useCartStore((s) => s.clearCart);
  useEffect(() => {
    void clearCart();
  }, [clearCart]);
  return null;
}
