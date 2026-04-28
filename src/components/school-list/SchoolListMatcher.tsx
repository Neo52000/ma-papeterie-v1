import { useState } from 'react';
import { useCartStore } from '@/stores/cartStore';

interface Candidate {
  id: string;
  name: string;
  slug: string | null;
  brand: string | null;
  imageUrl: string | null;
  priceTtc: number;
  priceHt: number;
  shopifyVariantId: string | null;
}

interface MatchedLine {
  rawLine: string;
  query: string;
  quantity: number;
  candidates: Candidate[];
  /** Index of the candidate the user picked. -1 = ignored / not added. */
  selectedIndex: number;
  /** True once the user clicked "Ajouter au panier" for this line. */
  added: boolean;
}

interface UnmatchedLine {
  rawLine: string;
  query: string;
  quantity: number;
}

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

const SAMPLE = `1 cahier 24x32 grands carreaux 96 pages
12 stylos bille bleu
1 trousse
2 surligneurs jaune
1 ardoise blanche
1 paquet de feuilles A4`;

export default function SchoolListMatcher() {
  const [text, setText] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [matched, setMatched] = useState<MatchedLine[] | null>(null);
  const [unmatched, setUnmatched] = useState<UnmatchedLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const addLine = useCartStore((s) => s.addLine);
  const openDrawer = useCartStore((s) => s.openDrawer);

  const handleMatch = async () => {
    setIsMatching(true);
    setError(null);
    try {
      const res = await fetch('/api/liste-scolaire/match', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        matches: Array<Omit<MatchedLine, 'selectedIndex' | 'added'>>;
        unmatched: UnmatchedLine[];
      };
      setMatched(
        json.matches.map((m) => ({
          ...m,
          selectedIndex: m.candidates.length > 0 ? 0 : -1,
          added: false,
        })),
      );
      setUnmatched(json.unmatched);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsMatching(false);
    }
  };

  const handleAddOne = async (idx: number) => {
    if (!matched) return;
    const line = matched[idx];
    const candidate = line.candidates[line.selectedIndex];
    if (!candidate?.shopifyVariantId || !candidate.slug) return;
    await addLine(
      {
        variantId: candidate.shopifyVariantId,
        productSupabaseId: candidate.id,
        productName: candidate.name,
        productSlug: candidate.slug,
        imageUrl: candidate.imageUrl,
        brand: candidate.brand,
        unitPriceTtc: candidate.priceTtc,
        unitPriceHt: candidate.priceHt,
        compareAtTtc: null,
      },
      line.quantity,
    );
    setMatched((prev) =>
      prev ? prev.map((m, i) => (i === idx ? { ...m, added: true } : m)) : prev,
    );
  };

  const handleAddAll = async () => {
    if (!matched) return;
    const toAdd = matched.filter(
      (m) =>
        !m.added &&
        m.selectedIndex >= 0 &&
        m.candidates[m.selectedIndex]?.shopifyVariantId &&
        m.candidates[m.selectedIndex]?.slug,
    );
    for (const line of toAdd) {
      const candidate = line.candidates[line.selectedIndex];
      // The check above guarantees these are non-null, but TS can't track it across the filter.
      if (!candidate.shopifyVariantId || !candidate.slug) continue;
      await addLine(
        {
          variantId: candidate.shopifyVariantId,
          productSupabaseId: candidate.id,
          productName: candidate.name,
          productSlug: candidate.slug,
          imageUrl: candidate.imageUrl,
          brand: candidate.brand,
          unitPriceTtc: candidate.priceTtc,
          unitPriceHt: candidate.priceHt,
          compareAtTtc: null,
        },
        line.quantity,
      );
    }
    setMatched((prev) =>
      prev ? prev.map((m) => (toAdd.includes(m) ? { ...m, added: true } : m)) : prev,
    );
    openDrawer();
  };

  const handleReset = () => {
    setMatched(null);
    setUnmatched([]);
    setError(null);
  };

  if (matched != null) {
    const totalAddable = matched.filter(
      (m) =>
        !m.added &&
        m.selectedIndex >= 0 &&
        m.candidates[m.selectedIndex]?.shopifyVariantId &&
        m.candidates[m.selectedIndex]?.slug,
    ).length;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-primary/70">
            {matched.length} ligne{matched.length > 1 ? 's' : ''} reconnue
            {matched.length > 1 ? 's' : ''}
            {unmatched.length > 0
              ? `, ${unmatched.length} non trouvée${unmatched.length > 1 ? 's' : ''}`
              : null}
            .
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-10 items-center justify-center rounded-btn border border-primary/15 bg-white px-4 text-sm font-medium text-primary hover:bg-bg-soft"
            >
              Modifier la liste
            </button>
            <button
              type="button"
              onClick={handleAddAll}
              disabled={totalAddable === 0}
              className="inline-flex h-10 items-center justify-center rounded-btn bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              Tout ajouter au panier ({totalAddable})
            </button>
          </div>
        </div>

        <ul className="divide-y divide-primary/10 rounded-card bg-white shadow-card">
          {matched.map((line, idx) => {
            const candidate = line.candidates[line.selectedIndex];
            const canAdd = !!candidate?.shopifyVariantId && !!candidate.slug;
            return (
              <li
                key={`${line.rawLine}-${idx}`}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start"
              >
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-primary/50">Ligne demandée</p>
                  <p className="text-sm font-medium text-primary">
                    {line.quantity}× {line.rawLine}
                  </p>
                  {line.candidates.length > 1 ? (
                    <select
                      value={line.selectedIndex}
                      aria-label={`Choisir le produit pour : ${line.rawLine}`}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        setMatched((prev) =>
                          prev
                            ? prev.map((m, i) =>
                                i === idx ? { ...m, selectedIndex: next, added: false } : m,
                              )
                            : prev,
                        );
                      }}
                      className="mt-2 h-10 w-full rounded-btn border border-primary/15 bg-white px-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                    >
                      {line.candidates.map((c, i) => (
                        <option key={c.id} value={i}>
                          {c.name} {c.brand ? `(${c.brand})` : ''} — {eur.format(c.priceTtc)}
                        </option>
                      ))}
                    </select>
                  ) : candidate ? (
                    <p className="mt-2 text-sm text-primary/70">
                      → {candidate.name}
                      {candidate.brand ? ` (${candidate.brand})` : ''} —{' '}
                      <span className="font-semibold text-primary">
                        {eur.format(candidate.priceTtc)}
                      </span>
                    </p>
                  ) : null}
                  {!canAdd && candidate ? (
                    <p className="mt-1 text-xs text-primary/50">
                      Non disponible en ligne — disponible en boutique uniquement.
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => handleAddOne(idx)}
                  disabled={!canAdd || line.added}
                  className="inline-flex h-10 items-center justify-center rounded-btn bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {line.added ? 'Ajouté ✓' : 'Ajouter'}
                </button>
              </li>
            );
          })}
        </ul>

        {unmatched.length > 0 ? (
          <div className="rounded-card bg-bg-soft p-4">
            <p className="text-sm font-medium text-primary">Lignes non reconnues</p>
            <p className="mt-1 text-xs text-primary/60">
              Ces articles ne correspondent à aucun produit en ligne. Vous pouvez reformuler la
              ligne, contacter la boutique, ou{' '}
              <a href="/devis" className="text-accent hover:text-accent-hover">
                demander un devis personnalisé
              </a>
              .
            </p>
            <ul className="mt-3 space-y-1 text-sm text-primary/70">
              {unmatched.map((u, i) => (
                <li key={i}>
                  — {u.quantity}× {u.rawLine}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-primary/70">
        Collez ou tapez la liste de fournitures (1 article par ligne, avec la quantité au début si
        vous voulez). On cherche les produits correspondants dans notre catalogue.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={SAMPLE}
        rows={10}
        className="w-full rounded-btn border border-primary/15 bg-white p-3 font-mono text-sm text-primary placeholder:text-primary/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
      {error ? (
        <p role="alert" className="rounded-btn bg-accent/10 px-3 py-2 text-sm text-accent">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setText(SAMPLE)}
          className="text-xs text-primary/60 underline hover:text-accent"
        >
          Charger un exemple
        </button>
        <button
          type="button"
          onClick={handleMatch}
          disabled={isMatching || text.trim().length < 3}
          className="inline-flex h-12 items-center justify-center rounded-btn bg-accent px-6 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {isMatching ? 'Recherche en cours…' : 'Trouver les produits'}
        </button>
      </div>
    </div>
  );
}
