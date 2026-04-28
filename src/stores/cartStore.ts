import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  cartCreate,
  cartLinesAdd,
  cartLinesRemove,
  cartLinesUpdate,
  type ShopifyCart,
} from '@/lib/shopify-cart';

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

// Merge Shopify response back into the local state. Shopify owns the truth
// for `lineId` + `quantity`; we keep the Supabase-side metadata (slug, brand,
// HT pricing) on each local line, indexed by variantId. Any local line that
// disappeared upstream is dropped; any upstream line we never saw locally is
// rendered with Shopify-only data (rare — happens after cartGet on a fresh
// session).
// Fire-and-forget tracking POST. Errors are swallowed: cart UX is the
// source of truth, server-side tracking is best-effort for analytics.
function trackCartSession(shopifyCart: ShopifyCart): void {
  if (typeof window === 'undefined') return;
  void fetch('/api/cart/track', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      cartId: shopifyCart.id,
      lineItemsCount: shopifyCart.totalQuantity,
      totalTtc: Number(shopifyCart.cost.totalAmount.amount),
      currency: shopifyCart.cost.totalAmount.currencyCode,
      checkoutUrl: shopifyCart.checkoutUrl,
    }),
  }).catch(() => undefined);
}

function mergeShopifyCart(shopifyCart: ShopifyCart, localLines: CartLine[]): CartLine[] {
  const localByVariant = new Map(localLines.map((l) => [l.variantId, l]));
  return shopifyCart.lines.edges.map(({ node }) => {
    const variantId = node.merchandise.id;
    const local = localByVariant.get(variantId);
    if (local) {
      return { ...local, lineId: node.id, quantity: node.quantity };
    }
    const ttc = Number(node.merchandise.price.amount);
    const compareAt = node.merchandise.compareAtPrice
      ? Number(node.merchandise.compareAtPrice.amount)
      : null;
    return {
      variantId,
      lineId: node.id,
      productSupabaseId: '',
      productName: node.merchandise.product.title,
      productSlug: node.merchandise.product.handle,
      imageUrl: node.merchandise.image?.url ?? null,
      brand: node.merchandise.product.vendor,
      unitPriceTtc: ttc,
      unitPriceHt: ttc / 1.2,
      compareAtTtc: compareAt,
      quantity: node.quantity,
    } satisfies CartLine;
  });
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addLine: async (line, quantity = 1) => {
        set({ isLoading: true, error: null });
        try {
          const { cartId, lines } = get();
          const merchandiseInput = { merchandiseId: line.variantId, quantity };
          const existing = lines.find((l) => l.variantId === line.variantId);

          // Optimistically reflect the new line locally so the merge step
          // below can match it by variantId and copy back its Shopify lineId.
          const optimisticLines: CartLine[] = existing
            ? lines.map((l) =>
                l.variantId === line.variantId ? { ...l, quantity: l.quantity + quantity } : l,
              )
            : [...lines, { ...line, quantity }];

          let shopifyCart: ShopifyCart;
          if (!cartId) {
            shopifyCart = await cartCreate([merchandiseInput]);
          } else if (existing && existing.lineId) {
            shopifyCart = await cartLinesUpdate(cartId, [
              { id: existing.lineId, quantity: existing.quantity + quantity },
            ]);
          } else {
            shopifyCart = await cartLinesAdd(cartId, [merchandiseInput]);
          }

          set({
            cartId: shopifyCart.id,
            checkoutUrl: shopifyCart.checkoutUrl,
            lines: mergeShopifyCart(shopifyCart, optimisticLines),
            isLoading: false,
          });
          trackCartSession(shopifyCart);
        } catch (err) {
          set({ isLoading: false, error: err instanceof Error ? err.message : String(err) });
          throw err;
        }
      },

      removeLine: async (variantId) => {
        const { cartId, lines } = get();
        const target = lines.find((l) => l.variantId === variantId);
        if (!cartId || !target?.lineId) {
          // Nothing to call upstream — purely local cleanup.
          set({ lines: lines.filter((l) => l.variantId !== variantId) });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const shopifyCart = await cartLinesRemove(cartId, [target.lineId]);
          set({
            checkoutUrl: shopifyCart.checkoutUrl,
            lines: mergeShopifyCart(shopifyCart, lines),
            isLoading: false,
          });
          trackCartSession(shopifyCart);
        } catch (err) {
          set({ isLoading: false, error: err instanceof Error ? err.message : String(err) });
          throw err;
        }
      },

      updateLineQuantity: async (variantId, quantity) => {
        if (quantity <= 0) {
          await get().removeLine(variantId);
          return;
        }
        const { cartId, lines } = get();
        const target = lines.find((l) => l.variantId === variantId);
        if (!cartId || !target?.lineId) {
          set({ lines: lines.map((l) => (l.variantId === variantId ? { ...l, quantity } : l)) });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const shopifyCart = await cartLinesUpdate(cartId, [{ id: target.lineId, quantity }]);
          set({
            checkoutUrl: shopifyCart.checkoutUrl,
            lines: mergeShopifyCart(shopifyCart, lines),
            isLoading: false,
          });
          trackCartSession(shopifyCart);
        } catch (err) {
          set({ isLoading: false, error: err instanceof Error ? err.message : String(err) });
          throw err;
        }
      },

      clearCart: async () => {
        // Shopify carts auto-expire after ~10 days; no dedicated mutation.
        // Local reset is enough — the user gets a fresh cartCreate on next add.
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

export const useCartIsEmpty = () => useCartStore((s) => s.lines.length === 0);

export const useCartHydrated = () => useCartStore((s) => s._hasHydrated);
