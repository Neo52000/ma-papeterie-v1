import { useState } from 'react';
import AdminGuard from './AdminGuard';
import { TableSkeleton } from './AdminSkeletons';
import { useAdminFetch } from '@/lib/admin-fetch';
import { dateTimeFmt, eurFmt } from '@/lib/admin-format';
import { formatOrderStatus, orderStatusTone } from '@/lib/order-status';

interface Order {
  id: string;
  shopify_order_id: string;
  shopify_order_name: string;
  shopify_created_at: string;
  customer_email: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  total_ttc: number;
  currency: string;
  financial_status: string | null;
  fulfillment_status: string | null;
  line_items: unknown;
}

const PERIODS = [
  { value: 7, label: '7j' },
  { value: 30, label: '30j' },
  { value: 90, label: '90j' },
  { value: 365, label: '1 an' },
];

const itemsCount = (lineItems: unknown): number => {
  if (Array.isArray(lineItems)) return lineItems.length;
  return 0;
};

const customerLabel = (o: Order): string => {
  const fullName = [o.customer_first_name, o.customer_last_name].filter(Boolean).join(' ').trim();
  return fullName || o.customer_email || '—';
};

export default function CommandesList() {
  return <AdminGuard>{({ token }) => <CommandesListInner token={token} />}</AdminGuard>;
}

function CommandesListInner({ token }: { token: string }) {
  const [days, setDays] = useState<number>(30);
  const { data, error } = useAdminFetch<{ items: Order[] }>(
    `/api/admin/commandes?days=${days}`,
    token,
    [days],
  );
  const items = data?.items ?? null;

  const totalRevenue = (items ?? []).reduce((sum, o) => sum + (o.total_ttc ?? 0), 0);
  const totalItems = (items ?? []).reduce((sum, o) => sum + itemsCount(o.line_items), 0);

  return (
    <>
      <nav
        aria-label="Filtre par période"
        className="mb-4 flex flex-wrap gap-2 border-b border-primary/10 pb-3"
      >
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setDays(p.value)}
            aria-current={days === p.value ? 'page' : undefined}
            className={`inline-flex h-8 items-center rounded-btn px-3 text-xs font-medium transition-colors ${
              days === p.value
                ? 'bg-primary text-white'
                : 'border border-primary/15 text-primary/70 hover:border-accent/50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </nav>

      {error && (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Erreur : {error}
        </div>
      )}

      {!error && items === null && (
        <TableSkeleton
          rows={6}
          colWidths={['w-24', 'w-16', 'w-1/3', 'w-12', 'w-20', 'w-20', 'w-24']}
        />
      )}

      {!error && items && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-card border border-primary/10 bg-white p-4">
              <p className="text-xs uppercase tracking-wider text-primary/60">Commandes</p>
              <p className="mt-1 font-display text-2xl font-semibold text-primary">
                {items.length}
              </p>
            </div>
            <div className="rounded-card border border-primary/10 bg-white p-4">
              <p className="text-xs uppercase tracking-wider text-primary/60">CA TTC</p>
              <p className="mt-1 font-display text-2xl font-semibold text-primary">
                {eurFmt.format(totalRevenue)}
              </p>
            </div>
            <div className="rounded-card border border-primary/10 bg-white p-4">
              <p className="text-xs uppercase tracking-wider text-primary/60">Articles</p>
              <p className="mt-1 font-display text-2xl font-semibold text-primary">{totalItems}</p>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="rounded-card border border-primary/10 bg-white p-12 text-center text-sm text-primary/60">
              Aucune commande sur cette période.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-card border border-primary/10 bg-white shadow-card">
              <table className="min-w-full divide-y divide-primary/10 text-sm">
                <thead className="bg-bg-soft">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                      N°
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                      Articles
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-primary/60">
                      Total TTC
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                      Paiement
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-primary/60">
                      Préparation
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5 bg-white">
                  {items.map((order) => (
                    <tr key={order.id} className="hover:bg-bg-soft/50">
                      <td className="px-4 py-3 text-xs text-primary/60">
                        {dateTimeFmt.format(new Date(order.shopify_created_at))}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-primary">
                        {order.shopify_order_name}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="text-primary">{customerLabel(order)}</p>
                        {order.customer_email && (
                          <p className="text-primary/60">{order.customer_email}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-primary/70">
                        {itemsCount(order.line_items)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-primary">
                        {eurFmt.format(order.total_ttc)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-badge px-2 py-0.5 text-xs font-medium ${orderStatusTone(order.financial_status)}`}
                        >
                          {formatOrderStatus(order.financial_status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-badge px-2 py-0.5 text-xs font-medium ${orderStatusTone(order.fulfillment_status)}`}
                        >
                          {formatOrderStatus(order.fulfillment_status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
