import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// V5 parity (Phase 5.1) — affichage prix HT vs TTC global au site.
//
// 'ttc' par défaut (B2C). 'ht' bascule via le toggle header (B2B).
// Persisté localStorage : la préférence reste entre visites.
//
// Pour éviter d'hydrater chaque ProductCard avec un store React,
// le toggle écrit aussi `<body data-price-mode="ttc|ht">` côté DOM.
// PriceDisplay.astro affiche alors HT ou TTC en se basant sur cet
// attribut via du CSS pur — zéro JS par carte produit.

export type PriceMode = 'ttc' | 'ht';

interface PriceModeStore {
  mode: PriceMode;
  toggle: () => void;
  setMode: (mode: PriceMode) => void;
}

export const usePriceModeStore = create<PriceModeStore>()(
  persist(
    (set, get) => ({
      mode: 'ttc',
      toggle: () => {
        const next = get().mode === 'ttc' ? 'ht' : 'ttc';
        if (typeof document !== 'undefined') {
          document.body.dataset.priceMode = next;
        }
        set({ mode: next });
      },
      setMode: (mode) => {
        if (typeof document !== 'undefined') {
          document.body.dataset.priceMode = mode;
        }
        set({ mode });
      },
    }),
    {
      name: 'ma-papeterie-price-mode',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // Sync DOM dès la réhydratation initiale (avant 1er render
        // utilisateur), pour éviter un flash TTC → HT.
        if (state && typeof document !== 'undefined') {
          document.body.dataset.priceMode = state.mode;
        }
      },
    },
  ),
);
