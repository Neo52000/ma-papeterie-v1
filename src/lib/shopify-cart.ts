import { shopifyFetch } from '@/lib/shopify';

// Single source of truth for the Cart fields we read back from Shopify.
// Kept narrow to what the drawer + checkout redirection needs.
const CART_FIELDS = `#graphql
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount { amount currencyCode }
      totalTaxAmount { amount currencyCode }
    }
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
              price { amount currencyCode }
              compareAtPrice { amount currencyCode }
              image { url altText }
              product {
                id
                title
                handle
                vendor
              }
            }
          }
        }
      }
    }
  }
`;

export interface ShopifyMoney {
  amount: string;
  currencyCode: string;
}

export interface ShopifyCartLine {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    price: ShopifyMoney;
    compareAtPrice: ShopifyMoney | null;
    image: { url: string; altText: string | null } | null;
    product: {
      id: string;
      title: string;
      handle: string;
      vendor: string | null;
    };
  };
}

export interface ShopifyCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    subtotalAmount: ShopifyMoney;
    totalAmount: ShopifyMoney;
    totalTaxAmount: ShopifyMoney | null;
  };
  lines: { edges: { node: ShopifyCartLine }[] };
}

export interface CartLineInput {
  merchandiseId: string;
  quantity: number;
}

export interface CartLineUpdateInput {
  id: string;
  quantity: number;
}

interface CartUserError {
  field: string[] | null;
  message: string;
  code: string | null;
}

interface CartMutationResult {
  cart: ShopifyCart | null;
  userErrors: CartUserError[];
}

function assertNoUserErrors(
  result: CartMutationResult,
  op: string,
): asserts result is { cart: ShopifyCart; userErrors: [] } {
  if (result.userErrors.length > 0) {
    const detail = result.userErrors
      .map((e) => `${e.field?.join('.') ?? '_'}: ${e.message}`)
      .join('; ');
    throw new Error(`Shopify ${op} userErrors: ${detail}`);
  }
  if (!result.cart) {
    throw new Error(`Shopify ${op} returned no cart and no userErrors.`);
  }
}

export async function cartCreate(lines: CartLineInput[]): Promise<ShopifyCart> {
  const query = `#graphql
    ${CART_FIELDS}
    mutation CartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart { ...CartFields }
        userErrors { field message code }
      }
    }
  `;
  const data = await shopifyFetch<{ cartCreate: CartMutationResult }>(query, {
    input: { lines },
  });
  assertNoUserErrors(data.cartCreate, 'cartCreate');
  return data.cartCreate.cart;
}

export async function cartGet(cartId: string): Promise<ShopifyCart | null> {
  const query = `#graphql
    ${CART_FIELDS}
    query CartGet($cartId: ID!) {
      cart(id: $cartId) { ...CartFields }
    }
  `;
  const data = await shopifyFetch<{ cart: ShopifyCart | null }>(query, { cartId });
  return data.cart;
}

export async function cartLinesAdd(cartId: string, lines: CartLineInput[]): Promise<ShopifyCart> {
  const query = `#graphql
    ${CART_FIELDS}
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
        userErrors { field message code }
      }
    }
  `;
  const data = await shopifyFetch<{ cartLinesAdd: CartMutationResult }>(query, { cartId, lines });
  assertNoUserErrors(data.cartLinesAdd, 'cartLinesAdd');
  return data.cartLinesAdd.cart;
}

export async function cartLinesUpdate(
  cartId: string,
  lines: CartLineUpdateInput[],
): Promise<ShopifyCart> {
  const query = `#graphql
    ${CART_FIELDS}
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
        userErrors { field message code }
      }
    }
  `;
  const data = await shopifyFetch<{ cartLinesUpdate: CartMutationResult }>(query, {
    cartId,
    lines,
  });
  assertNoUserErrors(data.cartLinesUpdate, 'cartLinesUpdate');
  return data.cartLinesUpdate.cart;
}

export async function cartLinesRemove(cartId: string, lineIds: string[]): Promise<ShopifyCart> {
  const query = `#graphql
    ${CART_FIELDS}
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ...CartFields }
        userErrors { field message code }
      }
    }
  `;
  const data = await shopifyFetch<{ cartLinesRemove: CartMutationResult }>(query, {
    cartId,
    lineIds,
  });
  assertNoUserErrors(data.cartLinesRemove, 'cartLinesRemove');
  return data.cartLinesRemove.cart;
}
