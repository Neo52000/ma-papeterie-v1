import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartLine {
  lineId?: string;
  variantId: string;

  productSupabaseId: string;

  productName: string;
  productSlug: string;
  imageUrl: string | null;
  brand: string | null;

  unitPriceTtc: number;
  unitPriceHt: number;
  compareAtTtc: number | null;

  quantity: number;
}

interface CartState {
  cartId: string | null;
  checkoutUrl: string | null;
  lines: CartLine[];

  isOpen: boolean;
  isLoading: boolean;
  error: string | null;

  _hasHydrated: boolean;
}

interface CartActions {
  addLine: (line: Omit<CartLine, 'quantity' | 'lineId'>, quantity?: number) => Promise<void>;
  removeLine: (variantId: string) => Promise<void>;
  updateLineQuantity: (variantId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;

  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  _setHasHydrated: (value: boolean) => void;
}

type CartStore = CartState & CartActions;

const initialState: CartState = {
  cartId: null,
  checkoutUrl: null,
  lines: [],
  isOpen: false,
  isLoading: false,
  error: null,
  _hasHydrated: false,
};

const noopStorage: Storage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  clear: () => undefined,
  key: () => null,
  length: 0,
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addLine: async (line, quantity = 1) => {
        // Phase 2 — Étape 2 : appeler shopifyCartLinesAdd (cartCreate si cartId null)
        set((state) => {
          const existing = state.lines.find((l) => l.variantId === line.variantId);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.variantId === line.variantId
                  ? { ...l, quantity: l.quantity + quantity }
                  : l,
              ),
            };
          }
          return { lines: [...state.lines, { ...line, quantity }] };
        });
      },

      removeLine: async (variantId) => {
        // Phase 2 — Étape 2 : appeler shopifyCartLinesRemove avec lineId
        set((state) => ({
          lines: state.lines.filter((l) => l.variantId !== variantId),
        }));
      },

      updateLineQuantity: async (variantId, quantity) => {
        // Phase 2 — Étape 2 : appeler shopifyCartLinesUpdate avec lineId
        if (quantity <= 0) {
          await get().removeLine(variantId);
          return;
        }
        set((state) => ({
          lines: state.lines.map((l) =>
            l.variantId === variantId ? { ...l, quantity } : l,
          ),
        }));
      },

      clearCart: async () => {
        // Phase 2 — Étape 2 : laisser expirer le cartId côté Shopify (pas de mutation dédiée)
        set({ ...initialState, _hasHydrated: true });
      },

      openDrawer: () => set({ isOpen: true }),
      closeDrawer: () => set({ isOpen: false }),
      toggleDrawer: () => set((s) => ({ isOpen: !s.isOpen })),

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      _setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'mapap-cart-v1',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : noopStorage,
      ),
      partialize: (state) => ({
        cartId: state.cartId,
        checkoutUrl: state.checkoutUrl,
        lines: state.lines,
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    },
  ),
);

export const useCartItemsCount = () =>
  useCartStore((s) => s.lines.reduce((sum, l) => sum + l.quantity, 0));

export const useCartSubtotalTtc = () =>
  useCartStore((s) => s.lines.reduce((sum, l) => sum + l.unitPriceTtc * l.quantity, 0));

export const useCartSubtotalHt = () =>
  useCartStore((s) => s.lines.reduce((sum, l) => sum + l.unitPriceHt * l.quantity, 0));

export const useCartIsEmpty = () =>
  useCartStore((s) => s.lines.length === 0);

export const useCartHydrated = () => useCartStore((s) => s._hasHydrated);
