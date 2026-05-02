import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  cartCreate,
  cartGet,
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

// Module-level mutex shared by every addLine call (Zustand store is a
// singleton so a single ref is enough). Prevents the double-cartCreate
// race when the user clicks Ajouter twice before the first POST resolves.
let cartCreatePromise: Promise<ShopifyCart> | null = null;

function mergeShopifyCart(shopifyCart: ShopifyCart, localLines: CartLine[]): CartLine[] {
  const localByVariant = new Map(localLines.map((l) => [l.variantId, l]));
  return shopifyCart.lines.edges.map(({ node }) => {
    const variantId = node.merchandise.id;
    const local = localByVariant.get(variantId);
    const upstreamTtc = Number(node.merchandise.price.amount);
    const upstreamCompareAt = node.merchandise.compareAtPrice
      ? Number(node.merchandise.compareAtPrice.amount)
      : null;

    if (local) {
      // Always overwrite TTC + compareAt from Shopify so the drawer can't
      // show a stale price the customer didn't agree to. Recompute HT
      // proportionally — preserves the local VAT ratio if Shopify only
      // shifted the TTC, falls back to /1.2 if local had no HT recorded.
      const ratio = local.unitPriceTtc > 0 ? local.unitPriceHt / local.unitPriceTtc : 1 / 1.2;
      return {
        ...local,
        lineId: node.id,
        quantity: node.quantity,
        unitPriceTtc: upstreamTtc,
        unitPriceHt: upstreamTtc * ratio,
        compareAtTtc: upstreamCompareAt,
      };
    }
    return {
      variantId,
      lineId: node.id,
      productSupabaseId: '',
      productName: node.merchandise.product.title,
      productSlug: node.merchandise.product.handle,
      imageUrl: node.merchandise.image?.url ?? null,
      brand: node.merchandise.product.vendor,
      unitPriceTtc: upstreamTtc,
      unitPriceHt: upstreamTtc / 1.2,
      compareAtTtc: upstreamCompareAt,
      quantity: node.quantity,
    } satisfies CartLine;
  });
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addLine: async (line, quantity = 1) => {
        // Mutex on cartCreate: two rapid clicks before the first cartCreate
        // resolves would each see `cartId == null` and create their own
        // upstream cart, orphaning the first one. Wait for the in-flight
        // create to settle, then fall through and use the resulting cartId.
        if (cartCreatePromise) {
          await cartCreatePromise.catch(() => undefined);
        }
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
            const pending = cartCreate([merchandiseInput]);
            cartCreatePromise = pending;
            try {
              shopifyCart = await pending;
            } finally {
              if (cartCreatePromise === pending) cartCreatePromise = null;
            }
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
        if (!state) return;
        state._setHasHydrated(true);

        // Validate the rehydrated cartId against Shopify. localStorage may
        // hold a cartId from a previous session that was checked out (the
        // returning user lands on a /cart/c/<id> URL that 404s) or simply
        // expired (Shopify carts auto-expire after ~10 days). In both cases
        // we MUST clear local state — otherwise the next addLine call hits
        // a dead cartId and the user can't recover without manually wiping
        // localStorage.
        //
        // Skip on SSR (no window → no fetch). The drawer doesn't render
        // until hydration anyway, so the validation always runs in the
        // browser before the user can interact with the cart.
        if (typeof window === 'undefined' || !state.cartId) return;

        void cartGet(state.cartId)
          .then((cart) => {
            if (!cart) {
              // Cart no longer exists upstream (checked out / expired).
              // Use the live store ref instead of `state` (which is the
              // pre-rehydrate snapshot — calling actions on it is brittle
              // across Zustand middleware versions).
              void useCartStore.getState().clearCart();
            }
          })
          .catch(() => {
            // Network error or non-2xx from Shopify. Do NOT clear local
            // state here — a transient offline blip would otherwise wipe
            // a perfectly valid cart and its checkoutUrl. The user's next
            // mutation will retry the upstream call; if the cart is truly
            // gone, that retry's response will surface as an error and we
            // can recover then.
          });
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
