#!/usr/bin/env node
// Import test de 10 produits Supabase → Shopify Admin API
// Publie sur le channel Headless uniquement. Stock initial 100 unités à la boutique Chaumont.
// Usage (depuis la racine du repo, où vit .env.local) :
//   node --env-file=.env.local .claude/worktrees/<worktree>/scripts/shopify-import-test.mjs

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';

// ────────────────────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────────────────────

const SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION ?? '2025-01';
const HEADLESS_PUB_NUMERIC = process.env.SHOPIFY_HEADLESS_PUBLICATION_ID;
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missing = Object.entries({
  SHOPIFY_SHOP_DOMAIN: SHOP_DOMAIN,
  SHOPIFY_ADMIN_ACCESS_TOKEN: ADMIN_TOKEN,
  SHOPIFY_HEADLESS_PUBLICATION_ID: HEADLESS_PUB_NUMERIC,
  SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY,
})
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length > 0) {
  throw new Error(`Missing env vars: ${missing.join(', ')}. Run with: node --env-file=.env.local scripts/shopify-import-test.mjs`);
}

const HEADLESS_PUBLICATION_ID = `gid://shopify/Publication/${HEADLESS_PUB_NUMERIC}`;
const BOUTIQUE_LOCATION_ID = 'gid://shopify/Location/87345332468';
const DEFAULT_STOCK_QTY = 100;
const RATE_LIMIT_DELAY_MS = 500;
const PRODUCTS_FILE = new URL('./shopify-test-products.json', import.meta.url);

const GRAPHQL_URL = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shopifyGraphQL(query, variables = {}, attempt = 1) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 429 && attempt === 1) {
    console.log('    ⏳ 429 Too Many Requests — sleep 5s puis retry');
    await sleep(5000);
    return shopifyGraphQL(query, variables, 2);
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const body = await res.json();

  if (body.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(body.errors)}`);
  }

  const root = body.data;
  const firstKey = root && Object.keys(root)[0];
  const op = firstKey ? root[firstKey] : null;
  if (op?.userErrors?.length) {
    throw new Error(`userErrors: ${JSON.stringify(op.userErrors)}`);
  }

  return root;
}

function buildDescription(product) {
  const brand = product.brand ?? 'Non spécifiée';
  return [
    `<p><strong>${escapeHtml(product.name)}</strong></p>`,
    `<p>Marque : ${escapeHtml(brand)}</p>`,
    `<p>Disponible à la boutique Ma Papeterie Reine &amp; Fils, 10 rue Toupot de Béveaux, Chaumont (52).</p>`,
    `<p>Livraison France métropolitaine.</p>`,
  ].join('\n');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function numericId(gid) {
  return gid.split('/').pop();
}

// ────────────────────────────────────────────────────────────────────────────
// Mutations GraphQL
// ────────────────────────────────────────────────────────────────────────────

const PRODUCT_CREATE = /* GraphQL */ `
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        handle
        variants(first: 1) {
          edges {
            node {
              id
              inventoryItem { id }
            }
          }
        }
      }
      userErrors { field message }
    }
  }
`;

const VARIANTS_BULK_UPDATE = /* GraphQL */ `
  mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id price compareAtPrice barcode sku }
      userErrors { field message }
    }
  }
`;

const INVENTORY_ACTIVATE = /* GraphQL */ `
  mutation inventoryActivate($inventoryItemId: ID!, $locationId: ID!) {
    inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId) {
      inventoryLevel { id }
      userErrors { field message }
    }
  }
`;

const INVENTORY_SET_ON_HAND = /* GraphQL */ `
  mutation inventorySetOnHandQuantities($input: InventorySetOnHandQuantitiesInput!) {
    inventorySetOnHandQuantities(input: $input) {
      inventoryAdjustmentGroup { id }
      userErrors { field message }
    }
  }
`;

const PUBLISHABLE_PUBLISH = /* GraphQL */ `
  mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      userErrors { field message }
    }
  }
`;

// ────────────────────────────────────────────────────────────────────────────
// Import flow
// ────────────────────────────────────────────────────────────────────────────

async function importProduct(product, supabase) {
  const compareAt =
    product.public_price_ttc && product.public_price_ttc > product.price_ttc
      ? product.public_price_ttc.toFixed(2)
      : null;

  // Step 1 — productCreate
  const createInput = {
    title: product.name,
    descriptionHtml: buildDescription(product),
    vendor: product.brand ?? 'Ma Papeterie',
    productType: product.category,
    tags: [product.category, product.brand].filter(Boolean),
    status: 'ACTIVE',
  };

  const createRes = await shopifyGraphQL(PRODUCT_CREATE, { input: createInput });
  const createdProduct = createRes.productCreate.product;
  const productId = createdProduct.id;
  const variantEdge = createdProduct.variants.edges[0];
  if (!variantEdge) throw new Error('productCreate returned no default variant');
  const variantId = variantEdge.node.id;
  const inventoryItemId = variantEdge.node.inventoryItem.id;

  // Step 2 — productVariantsBulkUpdate (price, sku, barcode, compareAt)
  const variantInput = {
    id: variantId,
    price: product.price_ttc.toFixed(2),
    barcode: product.ean,
    inventoryItem: {
      sku: product.ean,
      tracked: true,
    },
    inventoryPolicy: 'DENY',
  };
  if (compareAt) variantInput.compareAtPrice = compareAt;

  await shopifyGraphQL(VARIANTS_BULK_UPDATE, {
    productId,
    variants: [variantInput],
  });

  // Step 3a — inventoryActivate (connect item to location, quantity ignored in 2025-01)
  await shopifyGraphQL(INVENTORY_ACTIVATE, {
    inventoryItemId,
    locationId: BOUTIQUE_LOCATION_ID,
  });

  // Step 3b — inventorySetOnHandQuantities (actually sets the stock)
  await shopifyGraphQL(INVENTORY_SET_ON_HAND, {
    input: {
      reason: 'correction',
      referenceDocumentUri: `logistics://ma-papeterie/test-import-${product.supabase_id}`,
      setQuantities: [{
        inventoryItemId,
        locationId: BOUTIQUE_LOCATION_ID,
        quantity: DEFAULT_STOCK_QTY,
      }],
    },
  });

  // Step 4 — publishablePublish on Headless
  await shopifyGraphQL(PUBLISHABLE_PUBLISH, {
    id: productId,
    input: [{ publicationId: HEADLESS_PUBLICATION_ID }],
  });

  // Step 5 — UPDATE Supabase
  const { error: supabaseErr } = await supabase
    .from('products')
    .update({
      shopify_product_id: productId,
      shopify_variant_id: variantId,
      shopify_inventory_item_id: inventoryItemId,
      shopify_synced_at: new Date().toISOString(),
    })
    .eq('id', product.supabase_id);

  if (supabaseErr) {
    throw new Error(`Supabase update failed: ${supabaseErr.message}`);
  }

  return { productId, variantId, inventoryItemId };
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  const raw = await readFile(PRODUCTS_FILE, 'utf8');
  const products = JSON.parse(raw);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  console.log(`\n🚀 Import de ${products.length} produits vers Shopify (${SHOP_DOMAIN})`);
  console.log(`   Publication Headless : ${HEADLESS_PUBLICATION_ID}`);
  console.log(`   Location boutique   : ${BOUTIQUE_LOCATION_ID}`);
  console.log(`   Stock initial       : ${DEFAULT_STOCK_QTY} unités\n`);

  const results = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const label = `[${i + 1}/${products.length}]`;

    try {
      const { productId, variantId } = await importProduct(product, supabase);
      console.log(`${label} ✅ ${product.name.slice(0, 70)}`);
      console.log(`     productId=${productId}`);
      console.log(`     variantId=${variantId}`);
      results.push({ supabase_id: product.supabase_id, status: 'ok', productId, variantId });
    } catch (err) {
      console.error(`${label} ❌ ${product.name.slice(0, 70)}`);
      console.error(`     ${err.message}`);
      results.push({ supabase_id: product.supabase_id, status: 'error', error: err.message });
    }

    if (i < products.length - 1) {
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  // Summary
  const ok = results.filter((r) => r.status === 'ok');
  const ko = results.filter((r) => r.status === 'error');

  console.log('\n================================');
  console.log('📊 IMPORT TERMINÉ');
  console.log(`   Succès : ${ok.length}/${products.length}`);
  console.log(`   Échecs : ${ko.length}/${products.length}`);
  if (ko.length > 0) {
    console.log('\n   Produits en échec :');
    for (const r of ko) {
      console.log(`   - supabase_id=${r.supabase_id} → ${r.error}`);
    }
  }
  console.log('================================\n');

  if (ok.length > 0) {
    const storeHandle = SHOP_DOMAIN.replace('.myshopify.com', '');
    console.log(`🔗 Vérification visuelle dans Shopify admin :`);
    console.log(`   https://admin.shopify.com/store/${storeHandle}/products`);
    console.log(`\n   Produit par produit :`);
    for (const r of ok) {
      console.log(`   https://admin.shopify.com/store/${storeHandle}/products/${numericId(r.productId)}`);
    }
    console.log();
  }

  process.exit(ko.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\n💥 Erreur fatale :', err);
  process.exit(1);
});
