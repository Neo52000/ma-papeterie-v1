// Alkor supplier adapter (Phase C — V2.x).
//
// Stub pour l'instant : Alkor utilise du XML EDI (format à confirmer
// avec leur doc API), mais sans accès sandbox je ne peux qu'esquisser
// l'interface attendue.
//
// Quand Élie aura :
//   - les credentials sandbox Alkor
//   - le schéma XML (DTD ou XSD)
//   - 1 fichier exemple catalogue + 1 fichier exemple commande
// → on remplit les fonctions ci-dessous.

import type { Product } from '@/types/database';

export interface AlkorProductSource {
  alkor_sku: string;
  ean: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  description: string | null;
  cost_price_ht: number;
  public_price_ttc: number | null;
  vat_rate: number;
  stock_quantity: number;
  image_url: string | null;
}

export interface AlkorOrderLine {
  alkor_sku: string;
  quantity: number;
  unit_price_ht: number;
}

export interface AlkorOrder {
  order_number: string;
  delivery_address: {
    name: string;
    street: string;
    zip: string;
    city: string;
    country: string;
  };
  lines: AlkorOrderLine[];
}

/**
 * Parse un fichier XML catalogue Alkor → tableau de produits prêts à
 * upserter dans la table `products`. À implémenter quand on aura le schéma.
 */
export function parseAlkorCatalogue(_xml: string): AlkorProductSource[] {
  throw new Error('parseAlkorCatalogue: non implémenté — schéma XML Alkor manquant.');
}

/**
 * Convertit un AlkorProductSource en row Insert pour public.products.
 * Garde le `supplier_sku` pour la réconciliation lors des prochains syncs.
 */
export function toProductInsert(source: AlkorProductSource): Partial<Product> & {
  supplier: string;
  supplier_sku: string;
  name: string;
  category: string;
  price: number;
} {
  return {
    name: source.name,
    brand: source.brand,
    category: source.category ?? 'Non classé',
    description: source.description,
    ean: source.ean,
    cost_price: source.cost_price_ht,
    public_price_ttc: source.public_price_ttc,
    tva_rate: source.vat_rate,
    stock_quantity: source.stock_quantity,
    image_url: source.image_url,
    price: source.public_price_ttc ?? 0,
    supplier: 'alkor',
    supplier_sku: source.alkor_sku,
    is_active: true,
    is_vendable: source.stock_quantity > 0,
  };
}

/**
 * Sérialise une commande Shopify vers le format XML EDI Alkor.
 * À implémenter quand on aura le schéma. Probablement un EDIFACT ORDERS
 * ou un XML propriétaire — Alkor fournira la spec.
 */
export function serializeAlkorOrder(_order: AlkorOrder): string {
  throw new Error('serializeAlkorOrder: non implémenté — schéma EDI Alkor manquant.');
}
