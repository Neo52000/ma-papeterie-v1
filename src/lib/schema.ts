// Schema.org helpers — JSON-LD strings for SEO injection.
// Covered: Organization, LocalBusiness, Product, BreadcrumbList, FAQPage.

const SITE_URL = import.meta.env.PUBLIC_SITE_URL;

export interface ProductSchemaInput {
  name: string;
  description: string;
  sku: string;
  brand?: string;
  image: string[];
  priceTTC: number;
  availability: 'in_stock' | 'out_of_stock' | 'low_stock';
  url: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export function organizationSchema(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Ma Papeterie — Reine & Fils',
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.ico`,
    sameAs: [],
  });
}

export function localBusinessSchema(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'OfficeEquipmentStore',
    name: 'Ma Papeterie — Reine & Fils',
    image: `${SITE_URL}/favicon.ico`,
    '@id': SITE_URL,
    url: SITE_URL,
    email: 'contact@ma-papeterie.fr',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '10 rue Toupot de Béveaux',
      postalCode: '52000',
      addressLocality: 'Chaumont',
      addressRegion: 'Haute-Marne',
      addressCountry: 'FR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 48.111,
      longitude: 5.139,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '09:00',
        closes: '18:00',
      },
    ],
    priceRange: '€€',
    areaServed: 'Haute-Marne',
  });
}

export function productSchema(input: ProductSchemaInput): string {
  const availabilityMap: Record<ProductSchemaInput['availability'], string> = {
    in_stock: 'https://schema.org/InStock',
    out_of_stock: 'https://schema.org/OutOfStock',
    low_stock: 'https://schema.org/LimitedAvailability',
  };

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    sku: input.sku,
    ...(input.brand && { brand: { '@type': 'Brand', name: input.brand } }),
    image: input.image,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: input.priceTTC.toFixed(2),
      availability: availabilityMap[input.availability],
      url: input.url,
    },
  });
}

export function breadcrumbSchema(items: BreadcrumbItem[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  });
}

export interface ItemListProductInput {
  name: string;
  slug: string;
  image_url: string | null;
  priceTTC: number;
  brand: string | null;
}

export function itemListSchema(products: ItemListProductInput[], listName: string): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: p.name,
        image: p.image_url || `${SITE_URL}/placeholder-product.svg`,
        url: `${SITE_URL}/produit/${p.slug}`,
        ...(p.brand && { brand: { '@type': 'Brand', name: p.brand } }),
        offers: {
          '@type': 'Offer',
          price: p.priceTTC.toFixed(2),
          priceCurrency: 'EUR',
          availability: 'https://schema.org/InStock',
        },
      },
    })),
  });
}

export function faqSchema(items: FAQItem[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  });
}
