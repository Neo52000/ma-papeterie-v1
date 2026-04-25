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
  throw new Error(
    `Missing env vars: ${missing.join(', ')}. Run with: node --env-file=.env.local scripts/shopify-import-test.mjs`,
  );
}

const TEST_TAG = 'shopify-import-test';

// Garde-fou anti-destruction. Refuse de tourner sur un store qui ne ressemble pas
// à un environnement de test, sauf override explicite via ALLOW_DESTRUCTIVE_TEST.
const isExplicitlyAllowed = process.env.ALLOW_DESTRUCTIVE_TEST === 'true';
const looksLikeTestStore = /-test|-staging|-dev/i.test(SHOP_DOMAIN);

if (!looksLikeTestStore && !isExplicitlyAllowed) {
  console.error(`❌ Store "${SHOP_DOMAIN}" non identifié comme environnement de test.`);
  console.error(`   Options pour débloquer :`);
  console.error(`   - Renommer le store avec suffixe -test, -staging ou -dev`);
  console.error(`   - OU exporter ALLOW_DESTRUCTIVE_TEST=true (à tes risques)`);
  process.exit(1);
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
              inventoryItem {
                id
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const VARIANTS_BULK_UPDATE = /* GraphQL */ `
  mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
        price
        compareAtPrice
        barcode
        sku
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const INVENTORY_ACTIVATE = /* GraphQL */ `
  mutation inventoryActivate($inventoryItemId: ID!, $locationId: ID!) {
    inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId) {
      inventoryLevel {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const INVENTORY_SET_ON_HAND = /* GraphQL */ `
  mutation inventorySetOnHandQuantities($input: InventorySetOnHandQuantitiesInput!) {
    inventorySetOnHandQuantities(input: $input) {
      inventoryAdjustmentGroup {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const PUBLISHABLE_PUBLISH = /* GraphQL */ `
  mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      userErrors {
        field
        message
      }
    }
  }
`;

// ────────────────────────────────────────────────────────────────────────────
// Import flow
// ────────────────────────────────────────────────────────────────────────────

async function importProduct(product, supabase) {
  // Step 0 — Calcul prix d'affichage via RPC compute_display_price.
  // Politique : SKIP plutôt que fallback silencieux. Le prix brut product.price_ttc
  // est volontairement écarté car la RPC est la single source of truth pricing
  // (voir src/lib/pricing.ts et migration 20260424090000_compute_display_price_rpc.sql).
  let displayPriceTtc;
  let compareAtTtc = null;
  let priceSource;

  try {
    const { data, error } = await supabase.rpc('compute_display_price', {
      p_product_id: product.supabase_id,
    });

    if (error) {
      throw new Error(`RPC error: ${error.message}`);
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (!row || row.display_price_ttc == null) {
      throw new Error('RPC a retourné aucune ligne ou display_price_ttc null');
    }

    const candidate = Number(row.display_price_ttc);
    if (!Number.isFinite(candidate) || candidate <= 0.02) {
      throw new Error(`Prix sentinel/invalide : ${candidate}`);
    }

    displayPriceTtc = candidate.toFixed(2);

    if (row.compare_at_ttc != null) {
      const compareCandidate = Number(row.compare_at_ttc);
      if (Number.isFinite(compareCandidate) && compareCandidate > candidate) {
        compareAtTtc = compareCandidate.toFixed(2);
      }
    }

    priceSource = row.source ?? 'rpc:compute_display_price';
    console.log(`     💰 ${product.ean} — ${displayPriceTtc}€ (source: ${priceSource})`);
  } catch (e) {
    console.error(`     ❌ ${product.ean} — Skip import : ${e.message}`);
    return {
      ean: product.ean,
      supabase_id: product.supabase_id,
      status: 'skipped_price_failure',
      reason: e.message,
    };
  }

  // Step 1 — productCreate. TEST_TAG fusionné en tête, dédupliqué.
  const createInput = {
    title: product.name,
    descriptionHtml: buildDescription(product),
    vendor: product.brand ?? 'Ma Papeterie',
    productType: product.category,
    tags: Array.from(new Set([TEST_TAG, product.category, product.brand].filter(Boolean))),
    status: 'ACTIVE',
  };

  const createRes = await shopifyGraphQL(PRODUCT_CREATE, { input: createInput });
  const createdProduct = createRes.productCreate.product;
  const productId = createdProduct.id;
  const variantEdge = createdProduct.variants.edges[0];
  if (!variantEdge) throw new Error('productCreate returned no default variant');
  const variantId = variantEdge.node.id;
  const inventoryItemId = variantEdge.node.inventoryItem.id;

  // Step 2 — productVariantsBulkUpdate (price RPC, sku, barcode, compareAt)
  const variantInput = {
    id: variantId,
    price: displayPriceTtc,
    barcode: product.ean,
    inventoryItem: {
      sku: product.ean,
      tracked: true,
    },
    inventoryPolicy: 'DENY',
  };
  if (compareAtTtc) variantInput.compareAtPrice = compareAtTtc;

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
      setQuantities: [
        {
          inventoryItemId,
          locationId: BOUTIQUE_LOCATION_ID,
          quantity: DEFAULT_STOCK_QTY,
        },
      ],
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

  return {
    ean: product.ean,
    supabase_id: product.supabase_id,
    status: 'imported',
    productId,
    variantId,
    inventoryItemId,
    displayPriceTtc,
    priceSource,
  };
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

    let result;
    try {
      result = await importProduct(product, supabase);
    } catch (err) {
      result = {
        ean: product.ean,
        supabase_id: product.supabase_id,
        status: 'failed',
        reason: err.message,
      };
    }

    if (result.status === 'imported') {
      console.log(`${label} ✅ ${product.name.slice(0, 70)}`);
      console.log(`     productId=${result.productId}`);
      console.log(`     variantId=${result.variantId}`);
    } else if (result.status === 'skipped_price_failure') {
      console.log(`${label} ⏭️  ${product.name.slice(0, 70)} — skip pricing`);
    } else {
      console.error(`${label} ❌ ${product.name.slice(0, 70)}`);
      console.error(`     ${result.reason}`);
    }

    results.push(result);

    if (i < products.length - 1) {
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  // Récap final
  console.log('\n═══════════════════════════════════════════');
  console.log('📊 RÉCAPITULATIF IMPORT');
  console.log('═══════════════════════════════════════════');
  console.table(
    results.map((r) => ({
      EAN: r.ean,
      Status: r.status,
      Prix: r.displayPriceTtc ?? '—',
      Source: r.priceSource ?? '—',
      Reason: r.reason ?? '',
    })),
  );

  const summary = {
    total: results.length,
    imported: results.filter((r) => r.status === 'imported').length,
    skipped_price: results.filter((r) => r.status === 'skipped_price_failure').length,
    failed: results.filter((r) => typeof r.status === 'string' && r.status.startsWith('failed'))
      .length,
  };
  console.log('\n', summary, '\n');

  const imported = results.filter((r) => r.status === 'imported');
  if (imported.length > 0) {
    const storeHandle = SHOP_DOMAIN.replace('.myshopify.com', '');
    console.log(`🔗 Vérification visuelle dans Shopify admin :`);
    console.log(`   https://admin.shopify.com/store/${storeHandle}/products`);
    console.log(`\n   Produit par produit :`);
    for (const r of imported) {
      console.log(
        `   https://admin.shopify.com/store/${storeHandle}/products/${numericId(r.productId)}`,
      );
    }
    console.log();
  }

  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\n💥 Erreur fatale :', err);
  process.exit(1);
});
