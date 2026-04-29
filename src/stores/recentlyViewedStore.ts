import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const MAX_RECENT = 8;

interface RecentlyViewedState {
  viewedProductIds: string[];
  recordView: (productId: string) => void;
  getRecentExcept: (currentId: string) => string[];
}

const noopStorage: Storage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  clear: () => undefined,
  key: () => null,
  length: 0,
};

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      viewedProductIds: [],

      recordView: (productId) => {
        if (!productId) return;
        const current = get().viewedProductIds;
        const deduped = current.filter((id) => id !== productId);
        const next = [productId, ...deduped].slice(0, MAX_RECENT);
        set({ viewedProductIds: next });
      },

      getRecentExcept: (currentId) => get().viewedProductIds.filter((id) => id !== currentId),
    }),
    {
      name: 'mapap-recently-viewed-v1',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : noopStorage,
      ),
      partialize: (state) => ({ viewedProductIds: state.viewedProductIds }),
    },
  ),
);
