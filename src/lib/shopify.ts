import { createStorefrontApiClient } from '@shopify/storefront-api-client';

const domain = import.meta.env.PUBLIC_SHOPIFY_DOMAIN;
const token = import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN;

if (!domain || !token) {
  throw new Error(
    'Missing Shopify env vars (PUBLIC_SHOPIFY_DOMAIN / PUBLIC_SHOPIFY_STOREFRONT_TOKEN).',
  );
}

export const shopifyClient = createStorefrontApiClient({
  storeDomain: domain,
  apiVersion: '2025-01',
  publicAccessToken: token,
});

/**
 * Thin typed wrapper over `shopifyClient.request` — forwards GraphQL errors as exceptions
 * so callers get a single throw surface (API route catches → 500).
 */
export async function shopifyFetch<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const { data, errors } = await shopifyClient.request<T>(query, { variables });
  if (errors) {
    const extractMessage = (e: unknown): string =>
      e instanceof Error
        ? e.message
        : typeof e === 'object' &&
            e !== null &&
            'message' in e &&
            typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : JSON.stringify(e);
    const message = Array.isArray(errors)
      ? errors.map(extractMessage).join('; ')
      : extractMessage(errors);
    throw new Error(`Shopify Storefront error: ${message}`);
  }
  if (!data) {
    throw new Error('Shopify Storefront returned no data.');
  }
  return data;
}
