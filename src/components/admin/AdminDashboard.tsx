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
  total_displayable_products: number;
  synced_to_shopify: number;
}

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
    return <KpiGridSkeleton count={6} />;
  }

  const syncPct =
    stats.total_displayable_products > 0
      ? Math.round((100 * stats.synced_to_shopify) / stats.total_displayable_products)
      : 0;

  const kpis: Array<{
    label: string;
    value: string;
    href?: string;
    hint?: string;
    intent?: 'default' | 'warning' | 'success';
  }> = [
    {
      label: 'Devis B2B en attente',
      value: numFmt.format(stats.devis_pending),
      href: '/admin/devis',
      hint: stats.devis_pending > 0 ? 'À traiter sous 24h ouvrées' : 'Aucun en attente',
      intent: stats.devis_pending > 5 ? 'warning' : 'default',
    },
    {
      label: 'Commandes 30 derniers jours',
      value: numFmt.format(stats.orders_30d),
      href: '/admin/commandes',
      hint: eurFmt.format(stats.total_orders_revenue_30d) + ' TTC',
      intent: 'success',
    },
    {
      label: 'Carts abandonnés (1h–24h)',
      value: numFmt.format(stats.carts_abandoned_24h),
      hint: 'Cron Brevo s’en charge',
    },
    {
      label: 'Notify back-in-stock',
      value: numFmt.format(stats.notify_stock_subscribers),
      hint: 'Cron 4h envoie au retour stock',
    },
    {
      label: 'Inscrits liste scolaire',
      value: numFmt.format(stats.liste_scolaire_waitlist),
      hint: 'Export CSV pour campagne Brevo',
    },
    {
      label: 'Sync Shopify',
      value: `${syncPct}%`,
      href: '/admin/produits',
      hint: `${numFmt.format(stats.synced_to_shopify)} / ${numFmt.format(stats.total_displayable_products)} produits`,
      intent: syncPct < 80 ? 'warning' : 'success',
    },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => {
          const intentClass =
            kpi.intent === 'warning'
              ? 'border-accent/30 bg-accent/5'
              : kpi.intent === 'success'
                ? 'border-green-200 bg-green-50/40'
                : 'border-primary/10 bg-white';
          return (
            <article
              key={kpi.label}
              className={`rounded-card border p-5 shadow-card ${intentClass}`}
            >
              <p className="text-xs font-medium uppercase tracking-wider text-primary/60">
                {kpi.label}
              </p>
              <p className="mt-2 font-display text-3xl font-semibold text-primary">{kpi.value}</p>
              {kpi.hint && <p className="mt-1 text-xs text-primary/50">{kpi.hint}</p>}
              {kpi.href && (
                <a
                  href={kpi.href}
                  className="mt-3 inline-flex text-xs font-medium text-accent hover:text-accent-hover"
                >
                  Voir détail →
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
