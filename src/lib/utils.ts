import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind class merger — shadcn canonical helper. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format EUR price with fr-FR locale. VAT is added on top of `amountHT` using `vatRate` (0.20 by default). */
export function formatPrice(
  amount: number,
  options: { mode?: 'HT' | 'TTC'; vatRate?: number } = {},
): string {
  const { mode = 'TTC', vatRate = 0.2 } = options;
  const value = mode === 'TTC' ? amount * (1 + vatRate) : amount;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

/** Format an ISO date string with fr-FR locale. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

/** Slugify a string (FR-safe) for URL fragments. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
