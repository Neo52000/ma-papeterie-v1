import { create } from 'zustand';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { toast } from '@/stores/toastStore';

// Wishlist client cache. Reads server state once on hydrate (when auth
// resolves), then keeps an in-memory Set for O(1) `isSaved(id)` checks.
// Mutations go through /api/me/wishlist with the Bearer token from the
// browser auth session — RLS enforces ownership, no service-role here.

interface WishlistState {
  /** Set of saved product ids. Empty before first load or for guests. */
  productIds: Set<string>;
  /** True once we've called the server (or determined the user is a guest). */
  hasLoaded: boolean;
  /** Pending mutation id to disable buttons / animate. */
  pending: string | null;
  load: () => Promise<void>;
  toggle: (productId: string, productName?: string) => Promise<void>;
  isSaved: (productId: string) => boolean;
}

const fetchWithAuth = async (
  path: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: unknown }> => {
  const { data: sessionData } = await supabaseBrowser.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { ok: false, status: 401, data: null };
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  return { ok: res.ok, status: res.status, data };
};

export const useWishlistStore = create<WishlistState>()((set, get) => ({
  productIds: new Set(),
  hasLoaded: false,
  pending: null,

  load: async () => {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    if (!sessionData.session) {
      set({ productIds: new Set(), hasLoaded: true });
      return;
    }
    const result = await fetchWithAuth('/api/me/wishlist');
    if (!result.ok) {
      set({ productIds: new Set(), hasLoaded: true });
      return;
    }
    const items = (result.data as { items?: Array<{ product_id: string }> }).items ?? [];
    set({ productIds: new Set(items.map((i) => i.product_id)), hasLoaded: true });
  },

  toggle: async (productId, productName) => {
    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    if (!sessionData.session) {
      toast.info('Connectez-vous pour utiliser les favoris', 5000);
      window.location.href = `/connexion?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    const isSaved = get().productIds.has(productId);
    set({ pending: productId });

    // Optimistic update — revert on failure.
    const next = new Set(get().productIds);
    if (isSaved) next.delete(productId);
    else next.add(productId);
    set({ productIds: next });

    const result = await fetchWithAuth('/api/me/wishlist', {
      method: isSaved ? 'DELETE' : 'POST',
      body: JSON.stringify({ productId }),
    });
    set({ pending: null });

    if (!result.ok) {
      // Revert.
      const reverted = new Set(get().productIds);
      if (isSaved) reverted.add(productId);
      else reverted.delete(productId);
      set({ productIds: reverted });
      toast.error('Impossible de mettre à jour les favoris');
      return;
    }

    if (isSaved) {
      toast.info(productName ? `${productName} retiré des favoris` : 'Retiré des favoris');
    } else {
      toast.success(productName ? `${productName} ajouté aux favoris` : 'Ajouté aux favoris');
    }
  },

  isSaved: (productId) => get().productIds.has(productId),
}));

// Auto-load on auth state change. Call once on module init from the React tree
// (we listen here so any island using the store gets a hydrated set).
if (typeof window !== 'undefined') {
  void useWishlistStore.getState().load();
  supabaseBrowser.auth.onAuthStateChange(() => {
    void useWishlistStore.getState().load();
  });
}
