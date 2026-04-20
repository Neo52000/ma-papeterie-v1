// Shopify Storefront API — minimal stubs for V1.
// Full generated types will replace these in Phase 2 (catalogue).

export interface MoneyV2 {
  amount: string;
  currencyCode: 'EUR';
}

export interface ShopifyImage {
  url: string;
  altText: string | null;
  width: number;
  height: number;
}

export interface ShopifyProductVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  quantityAvailable: number | null;
  price: MoneyV2;
  compareAtPrice: MoneyV2 | null;
  sku: string | null;
}

export interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  vendor: string;
  productType: string;
  tags: string[];
  images: { nodes: ShopifyImage[] };
  variants: { nodes: ShopifyProductVariant[] };
  priceRange: {
    minVariantPrice: MoneyV2;
    maxVariantPrice: MoneyV2;
  };
}

export interface ShopifyCartLine {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    product: Pick<ShopifyProduct, 'id' | 'handle' | 'title'>;
  };
  cost: { totalAmount: MoneyV2 };
}

export interface ShopifyCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  lines: { nodes: ShopifyCartLine[] };
  cost: {
    subtotalAmount: MoneyV2;
    totalAmount: MoneyV2;
    totalTaxAmount: MoneyV2 | null;
  };
}
