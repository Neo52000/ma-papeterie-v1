import AdminGuard from './AdminGuard';
import { KpiGridSkeleton } from './AdminSkeletons';
import { useAdminFetch } from '@/lib/admin-fetch';
import { eurFmt, numFmt } from '@/lib/admin-format';

interface Stats {
  devis_pending: number;
  carts_abandoned_24h: number;
  notify_stock_subscribers: number;
  liste_scolaire_waitlist: number;
  orders_30d: number;
  total_orders_revenue_30d: number;
  orders_prev_30d: number;
  total_orders_revenue_prev_30d: number;
  total_displayable_products: number;
  synced_to_shopify: number;
  out_of_stock_with_waitlist: number;
}

type Intent = 'default' | 'warning' | 'success' | 'danger';

interface Kpi {
  label: string;
  value: string;
  href?: string;
  hint?: string;
  trend?: Trend;
  intent?: Intent;
  icon: JSX.Element;
}

const ICON_CLASS = 'h-5 w-5';

const ICONS = {
  devis: (
    <svg
      className={ICON_CLASS}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  ),
  orders: (
    <svg
      className={ICON_CLASS}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18l-2 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L3 6Z" />
      <path d="M8 10V6a4 4 0 0 1 8 0v4" />
    </svg>
  ),
  abandonedCart: (
    <svg
      className={ICON_CLASS}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="17" cy="20" r="1.5" />
      <path d="M3 4h2l2.5 11h11l2-8H6" />
      <path d="M14 7l4 4M18 7l-4 4" />
    </svg>
  ),
  bell: (
    <svg
      className={ICON_CLASS}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  ),
  list: (
    <svg
      className={ICON_CLASS}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 3h8a2 2 0 0 1 2 2v16l-6-3-6 3V5a2 2 0 0 1 2-2Z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  ),
  sync: (
    <svg
      className={ICON_CLASS}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
      <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
      <path d="M21 3v5h-5M3 21v-5h5" />
    </svg>
  ),
  basket: (
    <svg
      className={ICON_CLASS}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 7h14l-1.6 11.2A2 2 0 0 1 15.4 20H8.6a2 2 0 0 1-2-1.8L5 7Z" />
      <path d="M9 10V5a3 3 0 0 1 6 0v5" />
      <path d="M3 7h18" />
    </svg>
  ),
  alert: (
    <svg
      className={ICON_CLASS}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
};

const INTENT_STYLES: Record<Intent, { card: string; iconWrap: string }> = {
  default: {
    card: 'border-primary/10 bg-white',
    iconWrap: 'bg-primary/5 text-primary/70',
  },
  warning: {
    card: 'border-accent/30 bg-accent/5',
    iconWrap: 'bg-accent/15 text-accent',
  },
  success: {
    card: 'border-green-200 bg-green-50/40',
    iconWrap: 'bg-green-100 text-green-700',
  },
  danger: {
    card: 'border-danger/30 bg-danger/5',
    iconWrap: 'bg-danger/10 text-danger',
  },
};

const TREND_TONES = {
  up: 'text-green-700',
  down: 'text-danger',
  flat: 'text-primary/50',
};

const TREND_GLYPH = { up: '↑', down: '↓', flat: '→' };

type Trend = { delta: number; direction: 'up' | 'down' | 'flat' };

const computeTrend = (current: number, previous: number): Trend => {
  if (previous === 0) {
    if (current === 0) return { delta: 0, direction: 'flat' };
    return { delta: 100, direction: 'up' };
  }
  const delta = ((current - previous) / previous) * 100;
  const direction = delta > 1 ? 'up' : delta < -1 ? 'down' : 'flat';
  return { delta: Math.abs(Math.round(delta)), direction };
};

export default function AdminDashboard() {
  return <AdminGuard>{({ token }) => <AdminDashboardInner token={token} />}</AdminGuard>;
}

function AdminDashboardInner({ token }: { token: string }) {
  const { data: stats, error } = useAdminFetch<Stats>('/api/admin/stats', token);

  if (error) {
    return (
      <p className="rounded-card border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        Erreur : {error}
      </p>
    );
  }

  if (!stats) {
    return <KpiGridSkeleton count={8} />;
  }

  const syncPct =
    stats.total_displayable_products > 0
      ? Math.round((100 * stats.synced_to_shopify) / stats.total_displayable_products)
      : 0;

  const aov30d = stats.orders_30d > 0 ? stats.total_orders_revenue_30d / stats.orders_30d : 0;
  const aovPrev =
    stats.orders_prev_30d > 0 ? stats.total_orders_revenue_prev_30d / stats.orders_prev_30d : 0;

  const revenueTrend = computeTrend(
    stats.total_orders_revenue_30d,
    stats.total_orders_revenue_prev_30d,
  );
  const aovTrend = computeTrend(aov30d, aovPrev);

  const kpis: Kpi[] = [
    {
      label: 'Devis B2B en attente',
      value: numFmt.format(stats.devis_pending),
      href: '/admin/devis',
      hint: stats.devis_pending > 0 ? 'À traiter sous 24h ouvrées' : 'Aucun en attente',
      intent: stats.devis_pending > 5 ? 'warning' : 'default',
      icon: ICONS.devis,
    },
    {
      label: 'Commandes 30 derniers jours',
      value: numFmt.format(stats.orders_30d),
      href: '/admin/commandes',
      hint: eurFmt.format(stats.total_orders_revenue_30d) + ' TTC',
      trend: revenueTrend,
      intent: 'success',
      icon: ICONS.orders,
    },
    {
      label: 'Panier moyen 30j',
      value: eurFmt.format(aov30d),
      hint: aovPrev > 0 ? `vs ${eurFmt.format(aovPrev)} J-60→J-30` : '—',
      trend: aovTrend,
      intent: aovTrend.direction === 'down' ? 'warning' : 'default',
      icon: ICONS.basket,
    },
    {
      label: 'Carts abandonnés (1h–24h)',
      value: numFmt.format(stats.carts_abandoned_24h),
      hint: 'Cron Brevo s’en charge',
      icon: ICONS.abandonedCart,
    },
    {
      label: 'Stock alerte',
      value: numFmt.format(stats.out_of_stock_with_waitlist),
      href: '/admin/produits?stock=out_of_stock',
      hint:
        stats.out_of_stock_with_waitlist > 0
          ? 'Produits OOS avec abonnés notify'
          : 'Aucun en attente',
      intent: stats.out_of_stock_with_waitlist > 5 ? 'danger' : 'default',
      icon: ICONS.alert,
    },
    {
      label: 'Notify back-in-stock',
      value: numFmt.format(stats.notify_stock_subscribers),
      hint: 'Cron 4h envoie au retour stock',
      icon: ICONS.bell,
    },
    {
      label: 'Inscrits liste scolaire',
      value: numFmt.format(stats.liste_scolaire_waitlist),
      hint: 'Export CSV pour campagne Brevo',
      icon: ICONS.list,
    },
    {
      label: 'Sync Shopify',
      value: `${syncPct}%`,
      href: '/admin/produits',
      hint: `${numFmt.format(stats.synced_to_shopify)} / ${numFmt.format(stats.total_displayable_products)} produits`,
      intent: syncPct < 80 ? 'warning' : 'success',
      icon: ICONS.sync,
    },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const styles = INTENT_STYLES[kpi.intent ?? 'default'];
          const interactive = !!kpi.href;
          const hoverClass = interactive
            ? 'transition hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-lg focus-within:border-accent/60'
            : '';
          return (
            <article
              key={kpi.label}
              className={`relative overflow-hidden rounded-card border p-5 shadow-card ${styles.card} ${hoverClass}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wider text-primary/60">
                  {kpi.label}
                </p>
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-btn ${styles.iconWrap}`}
                >
                  {kpi.icon}
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-semibold text-primary">{kpi.value}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                {kpi.hint && <span className="text-primary/50">{kpi.hint}</span>}
                {kpi.trend && kpi.trend.direction !== 'flat' && (
                  <span
                    className={`inline-flex items-center gap-0.5 font-medium ${TREND_TONES[kpi.trend.direction]}`}
                    aria-label={`${kpi.trend.direction === 'up' ? '+' : '-'}${kpi.trend.delta}% vs 30 jours précédents`}
                  >
                    <span aria-hidden="true">{TREND_GLYPH[kpi.trend.direction]}</span>
                    {kpi.trend.delta}%
                  </span>
                )}
              </div>
              {kpi.href && (
                <a
                  href={kpi.href}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  aria-label={`${kpi.label} — voir détail`}
                >
                  Voir détail
                  <span aria-hidden="true">→</span>
                </a>
              )}
            </article>
          );
        })}
      </div>

      <section className="mt-10 rounded-card border border-primary/10 bg-white p-6">
        <h2 className="font-display text-lg font-semibold text-primary">Liens rapides</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <li>
            <a
              href="https://supabase.com/dashboard/project/mgojmkzovqgpipybelrr/editor"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover"
            >
              Supabase Studio (table editor)
            </a>
          </li>
          <li>
            <a
              href="https://admin.shopify.com/store/ma-papeterie52"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover"
            >
              Shopify Admin
            </a>
          </li>
          <li>
            <a
              href="https://github.com/Neo52000/ma-papeterie-v1/actions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover"
            >
              GitHub Actions (sync, crons)
            </a>
          </li>
          <li>
            <a
              href="https://app.netlify.com/sites/ma-papeterie-v1"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover"
            >
              Netlify dashboard
            </a>
          </li>
        </ul>
      </section>
    </>
  );
}
