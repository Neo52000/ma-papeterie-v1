import { useMemo, useState } from 'react';
import AdminGuard from './AdminGuard';
import { TableSkeleton } from './AdminSkeletons';
import { useAdminFetch } from '@/lib/admin-fetch';
import { dateFmtShort } from '@/lib/admin-format';
import { buildCsv, downloadCsv } from '@/lib/csv-export';
import type { SearchNoResultRow, SearchLowCtrRow, SearchTrendRow } from '@/types/database';

interface InsightsPayload {
  noResults: SearchNoResultRow[];
  lowCtr: SearchLowCtrRow[];
  trend: SearchTrendRow[];
}

type Tab = 'no-results' | 'low-ctr';

export default function SearchInsightsView() {
  return <AdminGuard>{({ token }) => <Inner token={token} />}</AdminGuard>;
}

function Inner({ token }: { token: string }) {
  const { data, error } = useAdminFetch<InsightsPayload>('/api/admin/search-insights', token);
  const [tab, setTab] = useState<Tab>('no-results');

  const noResults = data?.noResults ?? null;
  const lowCtr = data?.lowCtr ?? null;
  const trend = data?.trend ?? null;

  if (error) {
    return (
      <div className="rounded-card border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        Erreur : {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Sparkline trend={trend} />

      <nav
        aria-label="Filtre par catégorie"
        className="flex flex-wrap items-center gap-2 border-b border-primary/10 pb-3"
      >
        <TabButton
          active={tab === 'no-results'}
          onClick={() => setTab('no-results')}
          label="Sans résultat"
          count={noResults?.length}
        />
        <TabButton
          active={tab === 'low-ctr'}
          onClick={() => setTab('low-ctr')}
          label="CTR < 15 %"
          count={lowCtr?.length}
        />
      </nav>

      {tab === 'no-results' ? <NoResultsPanel rows={noResults} /> : <LowCtrPanel rows={lowCtr} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex h-8 items-center gap-1.5 rounded-btn px-3 text-xs font-medium transition-colors ${
        active
          ? 'bg-primary text-white'
          : 'border border-primary/15 text-primary/70 hover:border-accent/50'
      }`}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`rounded-badge px-1.5 py-0.5 text-[10px] font-semibold ${
            active ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary/60'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ---------- Sparkline ----------

function Sparkline({ trend }: { trend: SearchTrendRow[] | null }) {
  // Inline SVG to avoid pulling recharts (~70 KB) onto an admin-only page.
  // Two polylines: total searches (primary) and no-result subset (accent).
  // Falls back to a "données insuffisantes" panel under 3 days of data.
  const { totalsPath, noResultsPath, max, totals, days } = useMemo(() => {
    const points = trend ?? [];
    const max = Math.max(1, ...points.map((p) => p.total_searches));
    const w = 100;
    const h = 32;
    const stepX = points.length > 1 ? w / (points.length - 1) : 0;
    const toPath = (key: 'total_searches' | 'no_results') =>
      points
        .map((p, i) => {
          const x = i * stepX;
          const y = h - (p[key] / max) * h;
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
    return {
      totalsPath: toPath('total_searches'),
      noResultsPath: toPath('no_results'),
      max,
      totals: points.reduce((s, p) => s + p.total_searches, 0),
      days: points.length,
    };
  }, [trend]);

  if (trend === null) {
    return (
      <div className="rounded-card border border-primary/10 bg-white p-5 shadow-card">
        <div className="h-4 w-32 animate-pulse rounded bg-primary/10" />
        <div className="mt-3 h-8 w-full animate-pulse rounded bg-primary/10" />
      </div>
    );
  }

  if (days < 3) {
    return (
      <div className="rounded-card border border-primary/10 bg-white p-5 text-sm text-primary/60 shadow-card">
        <p className="font-medium text-primary">Tendance</p>
        <p className="mt-1">
          Données insuffisantes — laissez la collecte tourner 7 jours pour voir une courbe
          significative.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-primary/10 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-primary">Volume de recherche · 30 derniers jours</p>
          <p className="text-xs text-primary/60">
            {totals.toLocaleString('fr-FR')} recherches sur {days} jour
            {days > 1 ? 's' : ''} · pic à {max.toLocaleString('fr-FR')}/j
          </p>
        </div>
        <ul className="flex gap-3 text-xs">
          <li className="flex items-center gap-1.5 text-primary/70">
            <span className="inline-block h-2 w-3 rounded-sm bg-primary" /> total
          </li>
          <li className="flex items-center gap-1.5 text-primary/70">
            <span className="inline-block h-2 w-3 rounded-sm bg-accent" /> sans résultat
          </li>
        </ul>
      </div>
      <svg
        viewBox="0 0 100 32"
        preserveAspectRatio="none"
        className="mt-3 h-16 w-full"
        role="img"
        aria-label={`Tendance ${days} jours, ${totals} recherches au total`}
      >
        <path
          d={totalsPath}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.6"
          className="text-primary"
        />
        <path
          d={noResultsPath}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.6"
          className="text-accent"
        />
      </svg>
    </div>
  );
}

// ---------- No-results tab ----------

const NO_RESULTS_PROMPT_HEAD = `# Mission : optimisation fiches produits ma-papeterie.fr

Voici les requêtes clients récurrentes sans résultat sur les 30 derniers jours.
Pour CHAQUE requête :
1. Identifie le produit existant le plus probablement recherché (contexte papeterie / bureau / scolaire FR).
2. Si aucun produit ne correspond → recommandation d'ajout fournisseur (Liderpapel, Comlandi, Alkor).
3. Réécris le titre actuel pour matcher l'intention client.
4. Mots-clés sémantiques manquants à ajouter dans la description.

Format de sortie : tableau Markdown.
Règle : aucune supposition floue. Si tu ne peux pas matcher → "Produit absent — ajout suggéré".

## Requêtes à traiter`;

const buildPromptL99 = (rows: SearchNoResultRow[]): string => {
  const lines = rows
    .slice(0, 20)
    .map(
      (r, i) =>
        `${i + 1}. "${r.query_norm}" (${r.occurrences} occurrences, ${r.unique_sessions} sessions uniques)`,
    );
  return `${NO_RESULTS_PROMPT_HEAD}\n\n${lines.join('\n')}\n`;
};

function NoResultsPanel({ rows }: { rows: SearchNoResultRow[] | null }) {
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'err'>('idle');

  if (rows === null) {
    return <TableSkeleton rows={6} colWidths={['w-1/2', 'w-1/4', 'w-1/4', 'w-16']} />;
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-primary/10 bg-white p-12 text-center text-sm text-primary/60">
        Aucune requête sans résultat sur les 30 derniers jours. 🎉
      </div>
    );
  }

  const onCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildPromptL99(rows));
      setCopyState('ok');
    } catch {
      setCopyState('err');
    }
    window.setTimeout(() => setCopyState('idle'), 2500);
  };

  const onCsv = () => {
    downloadCsv(
      `search-no-results-${new Date().toISOString().slice(0, 10)}.csv`,
      buildCsv(
        ['query_norm', 'occurrences', 'unique_sessions', 'last_seen', 'raw_variations'],
        rows.map((r) => [
          r.query_norm,
          r.occurrences,
          r.unique_sessions,
          r.last_seen,
          (r.raw_variations ?? []).join(' | '),
        ]),
      ),
    );
  };

  return (
    <section>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-primary/70">
          Top requêtes sans résultat (≥ 2 occurrences). Source : `v_search_no_results`.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCsv}
            className="inline-flex h-8 items-center rounded-btn border border-primary/15 px-3 text-xs font-medium text-primary/70 hover:border-accent/50"
          >
            ↓ Export CSV
          </button>
          <button
            type="button"
            onClick={onCopyPrompt}
            className="inline-flex h-8 items-center rounded-btn border border-accent/30 bg-accent/5 px-3 text-xs font-medium text-accent hover:bg-accent/10"
          >
            {copyState === 'ok'
              ? '✓ Copié'
              : copyState === 'err'
                ? '✗ Erreur'
                : '✨ Copier prompt L99'}
          </button>
        </div>
      </header>
      <div className="overflow-x-auto rounded-card border border-primary/10 bg-white shadow-card">
        <table className="min-w-full divide-y divide-primary/10 text-sm">
          <thead className="bg-bg-soft">
            <tr>
              <Th>Requête</Th>
              <Th>Variantes brutes</Th>
              <Th align="right">Occurrences</Th>
              <Th align="right">Sessions</Th>
              <Th align="right">Vue le</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/5">
            {rows.map((r) => (
              <tr key={r.query_norm} className="hover:bg-bg-soft/50">
                <td className="px-4 py-3">
                  <a
                    href={`/catalogue?q=${encodeURIComponent(r.query_norm)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:text-accent"
                  >
                    {r.query_norm}
                  </a>
                </td>
                <td className="px-4 py-3 text-xs text-primary/60">
                  {(r.raw_variations ?? []).slice(0, 3).join(' · ')}
                  {(r.raw_variations?.length ?? 0) > 3 ? ' …' : ''}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="rounded-badge bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    {r.occurrences}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-xs text-primary/70">
                  {r.unique_sessions}
                </td>
                <td className="px-4 py-3 text-right text-xs text-primary/60">
                  {dateFmtShort.format(new Date(r.last_seen))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------- Low CTR tab ----------

function LowCtrPanel({ rows }: { rows: SearchLowCtrRow[] | null }) {
  if (rows === null) {
    return <TableSkeleton rows={6} colWidths={['w-1/2', 'w-16', 'w-16', 'w-16', 'w-16']} />;
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-primary/10 bg-white p-12 text-center text-sm text-primary/60">
        Aucune requête en CTR faible. Soit les fiches sont bien titrées, soit le volume de clic
        n'est pas encore suffisant pour conclure (cible ≥ 5 recherches par requête).
      </div>
    );
  }

  const onCsv = () => {
    downloadCsv(
      `search-low-ctr-${new Date().toISOString().slice(0, 10)}.csv`,
      buildCsv(
        ['query_norm', 'searches', 'clicks', 'ctr_pct', 'avg_results', 'avg_click_position'],
        rows.map((r) => [
          r.query_norm,
          r.searches,
          r.clicks,
          r.ctr_pct,
          r.avg_results,
          r.avg_click_position ?? '',
        ]),
      ),
    );
  };

  return (
    <section>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-primary/70">
          Requêtes avec résultats mais CTR &lt; 15 % (≥ 5 recherches). Source : `v_search_low_ctr`.
        </p>
        <button
          type="button"
          onClick={onCsv}
          className="inline-flex h-8 items-center rounded-btn border border-primary/15 px-3 text-xs font-medium text-primary/70 hover:border-accent/50"
        >
          ↓ Export CSV
        </button>
      </header>
      <div className="overflow-x-auto rounded-card border border-primary/10 bg-white shadow-card">
        <table className="min-w-full divide-y divide-primary/10 text-sm">
          <thead className="bg-bg-soft">
            <tr>
              <Th>Requête</Th>
              <Th align="right">Recherches</Th>
              <Th align="right">Clics</Th>
              <Th align="right">CTR</Th>
              <Th align="right">Résultats moyens</Th>
              <Th align="right">Position clic moy.</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/5">
            {rows.map((r) => (
              <tr key={r.query_norm} className="hover:bg-bg-soft/50">
                <td className="px-4 py-3">
                  <a
                    href={`/catalogue?q=${encodeURIComponent(r.query_norm)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:text-accent"
                  >
                    {r.query_norm}
                  </a>
                </td>
                <td className="px-4 py-3 text-right text-xs text-primary/70">{r.searches}</td>
                <td className="px-4 py-3 text-right text-xs text-primary/70">{r.clicks}</td>
                <td className="px-4 py-3 text-right">
                  <span className="rounded-badge bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    {r.ctr_pct}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-xs text-primary/70">{r.avg_results}</td>
                <td className="px-4 py-3 text-right text-xs text-primary/70">
                  {r.avg_click_position ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-primary/60 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}
