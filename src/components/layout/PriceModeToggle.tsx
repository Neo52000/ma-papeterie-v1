import { usePriceModeStore } from '@/stores/priceModeStore';

// V5 parity (Phase 5.1) — switch HT/TTC du header.
//
// Présente 2 boutons accolés "HT" et "TTC" ; celui qui est actif
// passe en bleu primary. Met à jour le store + le data-attribute du
// body pour que tous les ProductCard / PriceDisplay basculent en CSS
// sans hydrater 100 fois.

export default function PriceModeToggle() {
  const mode = usePriceModeStore((s) => s.mode);
  const setMode = usePriceModeStore((s) => s.setMode);

  return (
    <div
      role="group"
      aria-label="Affichage des prix"
      className="inline-flex items-center rounded-btn border border-primary/15 bg-white p-0.5 text-xs font-semibold"
    >
      <button
        type="button"
        aria-pressed={mode === 'ht'}
        onClick={() => setMode('ht')}
        className={
          'inline-flex h-7 items-center justify-center rounded-btn px-3 transition-colors ' +
          (mode === 'ht' ? 'bg-primary text-white' : 'text-primary/70 hover:text-primary')
        }
      >
        HT
      </button>
      <button
        type="button"
        aria-pressed={mode === 'ttc'}
        onClick={() => setMode('ttc')}
        className={
          'inline-flex h-7 items-center justify-center rounded-btn px-3 transition-colors ' +
          (mode === 'ttc' ? 'bg-primary text-white' : 'text-primary/70 hover:text-primary')
        }
      >
        TTC
      </button>
    </div>
  );
}
