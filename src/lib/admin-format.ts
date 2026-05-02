// Centralised Intl formatters for the admin UI. Every list component used
// to declare its own `new Intl.*` instance with subtly different options
// (some date-only, some date+time, some short, some long) — this caused
// the same date to render differently across screens. Single source here
// keeps the admin coherent and saves ~14 redundant Intl declarations.

export const eurFmt = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

export const numFmt = new Intl.NumberFormat('fr-FR');

/** Short date — "02/05/2026". For dense tables and sidebar lists. */
export const dateFmtShort = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' });

/** Short date + time — "02/05/2026 14:32". For order/devis rows where
 *  the time of day matters (sub-day priority sorting). */
export const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

/** Long date — "2 mai 2026". For detail pages where the row is the
 *  primary content (devis/[id], commande/[id]) and density isn't critical. */
export const dateFmtLong = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });
