// Shared FR translations for Shopify order status strings. Both
// AccountDashboard (order list) and OrderDetail (single order page)
// render financial_status / fulfillment_status — keep the mapping in
// one place so a new Shopify status only needs adding here once.

const STATUS_LABELS: Record<string, string> = {
  paid: 'Payé',
  pending: 'En attente',
  refunded: 'Remboursé',
  voided: 'Annulé',
  fulfilled: 'Expédié',
  partial: 'Partiel',
  unfulfilled: 'En préparation',
  null: 'En préparation',
};

export function formatOrderStatus(value: string | null | undefined): string {
  if (!value) return '—';
  return STATUS_LABELS[value] ?? value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
}

/** Tailwind classes for the status pill background/text. Centralised so
 *  paid/fulfilled = green, refunded/voided = red, anything else neutral. */
export function orderStatusTone(value: string | null | undefined): string {
  if (value === 'paid' || value === 'fulfilled')
    return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  if (value === 'refunded' || value === 'voided')
    return 'bg-red-50 text-red-700 ring-1 ring-red-200';
  return 'bg-bg-soft text-primary ring-1 ring-primary/10';
}
