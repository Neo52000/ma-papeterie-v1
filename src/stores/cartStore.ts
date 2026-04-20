import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Phase 1 stub. Shopify Cart sync is wired in Phase 2 (panier + checkout F4).
export interface CartItem {
  variantId: string;
  productId: string;
  title: string;
  quantity: number;
  priceTTC: number;
  image?: string;
}

interface CartState {
  items: CartItem[];
  shopifyCartId: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clear: () => void;
  totalQuantity: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      shopifyCartId: null,
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId ? { ...i, quantity: i.quantity + item.quantity } : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (variantId) =>
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),
      updateQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)),
        })),
      clear: () => set({ items: [], shopifyCartId: null }),
      totalQuantity: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: 'mp-cart',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
