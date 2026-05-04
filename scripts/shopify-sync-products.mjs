#!/usr/bin/env node
// Sync incrémental Supabase → Shopify Admin API.
//
// Diff vs scripts/shopify-import-test.mjs :
//   - Source produits = Supabase (query catalogue visible) au lieu de JSON file
//   - Idempotence : productUpdate si shopify_product_id existe, productCreate sinon
//   - Garde-fou par défaut --dry-run ; flag --apply pour écrire vraiment
//   - Flags CLI : --max=N (limit), --apply (vraiment écrire), --only-stale (filtre)
//
// Usage :
//   node --env-file=.env.local scripts/shopify-sync-products.mjs --dry-run --max=5
//   node --env-file=.env.local scripts/shopify-sync-products.mjs --apply --max=50
//
// Recommandé pour le bulk initial : runs successifs --max=200 jusqu'à épuisement.

import { createClient } from '@supabase/supabase-js';

// ────────────────────────────────────────────────────────────────────────────
// Config + flags
// ────────────────────────────────────────────────────────────────────────────

const SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
let ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION ?? '2025-01';
const HEADLESS_PUB_NUMERIC = process.env.SHOPIFY_HEADLESS_PUBLICATION_ID;
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasOAuth = SHOPIFY_CLIENT_ID && SHOPIFY_CLIENT_SECRET;
const missing = Object.entries({
  SHOPIFY_SHOP_DOMAIN: SHOP_DOMAIN,
  SHOPIFY_ADMIN_ACCESS_TOKEN: hasOAuth ? 'oauth' : ADMIN_TOKEN,
  SHOPIFY_HEADLESS_PUBLICATION_ID: HEADLESS_PUB_NUMERIC,
  SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY,
})
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length > 0) {
  throw new Error(
    `Missing env vars: ${missing.join(', ')}. Run with: node --env-file=.env.local scripts/shopify-sync-products.mjs`,
  );
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const flagValue = (name, def) => {
  const idx = args.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (idx < 0) return def;
  const arg = args[idx];
  if (arg.includes('=')) return arg.split('=')[1];
  return args[idx + 1] ?? def;
};

const APPLY = flag('apply');
const DRY_RUN = !APPLY;
const MAX = Number(flagValue('max', '50'));
const ONLY_STALE = flag('only-stale');

const HEADLESS_PUBLICATION_ID = `gid://shopify/Publication/${HEADLESS_PUB_NUMERIC}`;
// Stock dual (V2.1) : on push stock_online vers la location ONLINE et
// stock_boutique vers la location POS. SHOPIFY_LOCATION_POS_ID est
// optionnel — sans lui, on retombe sur l'ancien comportement single-location
// (utile pour staging / dev sans POS configuré). LEGACY var
// SHOPIFY_LOCATION_ID supportée comme alias rétro-compat de _ONLINE_.
const _legacyLocId = process.env.SHOPIFY_LOCATION_ID;
const ONLINE_LOC_NUMERIC = process.env.SHOPIFY_LOCATION_ONLINE_ID ?? _legacyLocId;
const POS_LOC_NUMERIC = process.env.SHOPIFY_LOCATION_POS_ID ?? null;
const ONLINE_LOCATION_ID = ONLINE_LOC_NUMERIC
  ? `gid://shopify/Location/${ONLINE_LOC_NUMERIC.replace(/^gid:\/\/shopify\/Location\//, '')}`
  : 'gid://shopify/Location/87345332468';
const POS_LOCATION_ID = POS_LOC_NUMERIC
  ? `gid://shopify/Location/${POS_LOC_NUMERIC.replace(/^gid:\/\/shopify\/Location\//, '')}`
  : null;
const DEFAULT_STOCK_QTY = 100;
const RATE_LIMIT_DELAY_MS = 500;
const SYNC_TAG = 'supabase-sync';

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

  if (res.status === 429 && attempt <= 3) {
    const wait = 5000 * attempt;
    console.log(`    ⏳ 429 Too Many Requests — sleep ${wait / 1000}s puis retry (#${attempt})`);
    await sleep(wait);
    return shopifyGraphQL(query, variables, attempt + 1);
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
  return gid?.split('/').pop();
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

const PRODUCT_UPDATE = /* GraphQL */ `
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
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

// Resolve target publication IDs dynamically. Two channels are required:
//   - "Online Store" : the legacy sales channel that hydrates the
//     /cart/c/<id> URL the Storefront API returns. Without it the redirect
//     to /checkouts/cn/ 404s.
//   - The Headless storefront channel (named "Papeterie Reine & Fils" in
//     this store) : the channel the Storefront access token is bound to.
//     Variants must be published here for the cart to even contain them.
//
// The SHOPIFY_HEADLESS_PUBLICATION_ID env var that was set up for the
// initial import script actually pointed at Online Store, not the Headless
// channel — explains why the historical sync's checkout never worked end
// to end. We now resolve both by name and ignore that env var.
const PUBLICATIONS_QUERY = /* GraphQL */ `
  query Publications {
    publications(first: 25) {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`;

const HEADLESS_CHANNEL_NAME = process.env.SHOPIFY_HEADLESS_CHANNEL_NAME ?? 'Papeterie Reine & Fils';

let cachedTargetPublicationIds = null;
async function getTargetPublicationIds() {
  if (cachedTargetPublicationIds) return cachedTargetPublicationIds;
  const data = await shopifyGraphQL(PUBLICATIONS_QUERY);
  const all = data.publications.edges.map((e) => e.node);
  const onlineStore = all.find((p) => /^Online Store$/i.test(p.name));
  // Match the headless channel by name (case-insensitive, exact). Default
  // is "Papeterie Reine & Fils"; override via SHOPIFY_HEADLESS_CHANNEL_NAME
  // if the channel gets renamed.
  const headless = all.find((p) => p.name.toLowerCase() === HEADLESS_CHANNEL_NAME.toLowerCase());

  const ids = [];
  if (onlineStore) ids.push(onlineStore.id);
  else
    console.log(
      '⚠️  Online Store publication not found — /cart/c/<id> checkout will 404 on synced products.',
    );
  if (headless) ids.push(headless.id);
  else
    console.log(
      `⚠️  Headless channel "${HEADLESS_CHANNEL_NAME}" not found — Storefront API cart will not see synced variants.`,
    );

  if (ids.length === 0) {
    throw new Error(
      'No target publications resolved. Check Shopify Admin → Settings → Apps and sales channels.',
    );
  }

  cachedTargetPublicationIds = ids;
  return ids;
}

// ────────────────────────────────────────────────────────────────────────────
// Pricing — single source of truth via RPC compute_display_price
// ────────────────────────────────────────────────────────────────────────────

async function resolvePricing(supabase, supabaseId) {
  const { data, error } = await supabase.rpc('compute_display_price', {
    p_product_id: supabaseId,
  });
  if (error) throw new Error(`RPC error: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.display_price_ttc == null) {
    throw new Error('RPC returned no row or display_price_ttc null');
  }
  const candidate = Number(row.display_price_ttc);
  if (!Number.isFinite(candidate) || candidate <= 0.02) {
    throw new Error(`Sentinel/invalid price: ${candidate}`);
  }
  const compareCandidate = row.compare_at_ttc != null ? Number(row.compare_at_ttc) : null;
  const compareAt =
    compareCandidate != null && Number.isFinite(compareCandidate) && compareCandidate > candidate
      ? compareCandidate.toFixed(2)
      : null;
  return {
    displayPriceTtc: candidate.toFixed(2),
    compareAtTtc: compareAt,
    source: row.source ?? 'rpc:compute_display_price',
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Sync flows
// ────────────────────────────────────────────────────────────────────────────

async function syncCreate(product, pricing) {
  const createInput = {
    title: product.name,
    descriptionHtml: buildDescription(product),
    vendor: product.brand ?? 'Ma Papeterie',
    productType: product.category,
    tags: Array.from(new Set([SYNC_TAG, product.category, product.brand].filter(Boolean))),
    status: 'ACTIVE',
  };
  const createRes = await shopifyGraphQL(PRODUCT_CREATE, { input: createInput });
  const created = createRes.productCreate.product;
  const productId = created.id;
  const variantEdge = created.variants.edges[0];
  if (!variantEdge) throw new Error('productCreate returned no default variant');
  return {
    productId,
    variantId: variantEdge.node.id,
    inventoryItemId: variantEdge.node.inventoryItem.id,
  };
}

async function syncUpdate(product) {
  const updateInput = {
    id: product.shopify_product_id,
    title: product.name,
    descriptionHtml: buildDescription(product),
    vendor: product.brand ?? 'Ma Papeterie',
    productType: product.category,
    tags: Array.from(new Set([SYNC_TAG, product.category, product.brand].filter(Boolean))),
    status: 'ACTIVE',
  };
  await shopifyGraphQL(PRODUCT_UPDATE, { input: updateInput });
  return {
    productId: product.shopify_product_id,
    variantId: product.shopify_variant_id,
    inventoryItemId: product.shopify_inventory_item_id,
  };
}

async function syncVariantPriceStockPublish(ids, product, pricing) {
  // Variant : price + barcode + SKU + tracked
  const variantInput = {
    id: ids.variantId,
    price: pricing.displayPriceTtc,
    barcode: product.ean ?? undefined,
    inventoryItem: {
      sku: product.ean ?? undefined,
      tracked: true,
    },
    inventoryPolicy: 'DENY',
  };
  if (pricing.compareAtTtc) variantInput.compareAtPrice = pricing.compareAtTtc;
  await shopifyGraphQL(VARIANTS_BULK_UPDATE, {
    productId: ids.productId,
    variants: [variantInput],
  });

  // Inventory dual-location (V2.1) : push stock_online vers la location
  // ONLINE et stock_boutique vers la POS si configurée. Active chaque
  // location sur l'inventoryItem avant le set-on-hand.
  //
  // Compat : si POS_LOCATION_ID absent (env var manquante), on reste sur
  // un push single-location (ancien comportement). Si stock_online ET
  // stock_quantity sont à 0, on tombe sur DEFAULT_STOCK_QTY pour ne pas
  // créer un produit Shopify avec 0 stock visible (cas seed initial).
  const stockOnline =
    product.stock_online ?? product.stock_quantity ?? product.available_qty_total ?? 0;
  const stockBoutique = product.stock_boutique ?? 0;
  const onlineQty = stockOnline > 0 ? stockOnline : DEFAULT_STOCK_QTY;

  await shopifyGraphQL(INVENTORY_ACTIVATE, {
    inventoryItemId: ids.inventoryItemId,
    locationId: ONLINE_LOCATION_ID,
  });
  const setQuantities = [
    {
      inventoryItemId: ids.inventoryItemId,
      locationId: ONLINE_LOCATION_ID,
      quantity: onlineQty,
    },
  ];

  if (POS_LOCATION_ID) {
    await shopifyGraphQL(INVENTORY_ACTIVATE, {
      inventoryItemId: ids.inventoryItemId,
      locationId: POS_LOCATION_ID,
    });
    setQuantities.push({
      inventoryItemId: ids.inventoryItemId,
      locationId: POS_LOCATION_ID,
      quantity: stockBoutique,
    });
  }

  await shopifyGraphQL(INVENTORY_SET_ON_HAND, {
    input: {
      reason: 'correction',
      referenceDocumentUri: `logistics://ma-papeterie/sync-${product.id}`,
      setQuantities,
    },
  });

  // Publish on Headless (idempotent : Shopify ignore si déjà publié)
  const publicationIds = await getTargetPublicationIds();
  await shopifyGraphQL(PUBLISHABLE_PUBLISH, {
    id: ids.productId,
    input: publicationIds.map((publicationId) => ({ publicationId })),
  });
}

async function syncProduct(product, supabase) {
  const pricing = await resolvePricing(supabase, product.id);
  const isUpdate = !!product.shopify_product_id;
  const ids = isUpdate ? await syncUpdate(product) : await syncCreate(product, pricing);
  await syncVariantPriceStockPublish(ids, product, pricing);

  const { error } = await supabase
    .from('products')
    .update({
      shopify_product_id: ids.productId,
      shopify_variant_id: ids.variantId,
      shopify_inventory_item_id: ids.inventoryItemId,
      shopify_synced_at: new Date().toISOString(),
    })
    .eq('id', product.id);
  if (error) throw new Error(`Supabase update failed: ${error.message}`);

  return {
    id: product.id,
    name: product.name,
    status: isUpdate ? 'updated' : 'created',
    productId: ids.productId,
    variantId: ids.variantId,
    price: pricing.displayPriceTtc,
    source: pricing.source,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

async function refreshAdminTokenIfOAuth() {
  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) return;
  console.log('🔐 OAuth client_credentials grant…');
  const resp = await fetch(`https://${SHOP_DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: SHOPIFY_CLIENT_ID,
      client_secret: SHOPIFY_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OAuth client_credentials failed: ${resp.status} ${text}`);
  }
  const json = await resp.json();
  if (!json.access_token)
    throw new Error('OAuth: no access_token in response: ' + JSON.stringify(json));
  ADMIN_TOKEN = json.access_token;
  console.log(`   token        : ${ADMIN_TOKEN.slice(0, 12)}… (scopes: ${json.scope || '?'})`);
}

async function main() {
  await refreshAdminTokenIfOAuth();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const SELECT_COLS =
    'id,name,brand,category,ean,stock_quantity,stock_online,stock_boutique,sales_channel,available_qty_total,shopify_product_id,shopify_variant_id,shopify_inventory_item_id,shopify_synced_at';

  let query = supabase
    .from('products')
    .select(SELECT_COLS)
    .eq('is_active', true)
    .eq('is_vendable', true)
    // Stock dual : on ne pousse vers le canal Headless que les produits
    // visibles côté site. Les sales_channel='pos' restent purs POS et
    // n'ont pas vocation à apparaître sur le storefront. Un futur worker
    // dédié pourra les pusher vers une publication POS si besoin.
    .in('sales_channel', ['online', 'both'])
    .not('slug', 'is', null)
    .not('image_url', 'is', null);

  if (ONLY_STALE) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    query = query.or(`shopify_synced_at.is.null,shopify_synced_at.lt.${oneDayAgo}`);
  } else {
    query = query.is('shopify_synced_at', null);
  }

  query = query.order('created_at', { ascending: true }).limit(MAX);

  const { data: products, error } = await query;
  if (error) throw new Error(`Supabase select failed: ${error.message}`);

  console.log(`\n🔄 Sync Supabase → Shopify (${SHOP_DOMAIN})`);
  console.log(
    `   Mode               : ${DRY_RUN ? '🟡 DRY-RUN (no writes)' : '🔴 APPLY (writes!)'}`,
  );
  console.log(
    `   Filter             : ${ONLY_STALE ? 'unsynced OR stale > 24h' : 'unsynced only'}`,
  );
  console.log(`   Max products       : ${MAX}`);
  console.log(`   Found              : ${products.length}`);
  console.log(`   Publication Headless: ${HEADLESS_PUBLICATION_ID}`);
  console.log(`   Location ONLINE    : ${ONLINE_LOCATION_ID}`);
  console.log(`   Location POS       : ${POS_LOCATION_ID ?? '— (single-location mode)'}`);
  if (!DRY_RUN && products.length > 0) {
    const pubs = await getTargetPublicationIds();
    console.log(`   Publications cible : ${pubs.length} (${pubs.join(', ')})\n`);
  } else {
    console.log('');
  }

  if (products.length === 0) {
    console.log('✨ Nothing to sync. Exit clean.\n');
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log('Products that WOULD be synced:');
    console.table(
      products.slice(0, 20).map((p) => ({
        id: p.id.slice(0, 8),
        name: p.name.slice(0, 50),
        brand: p.brand ?? '—',
        action: p.shopify_product_id ? 'UPDATE' : 'CREATE',
      })),
    );
    if (products.length > 20) console.log(`... and ${products.length - 20} more`);
    console.log('\n(Re-run with --apply to actually sync.)\n');
    process.exit(0);
  }

  const results = [];
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const label = `[${i + 1}/${products.length}]`;
    let result;
    try {
      result = await syncProduct(product, supabase);
      const action = result.status === 'created' ? '✅' : '🔄';
      console.log(
        `${label} ${action} ${product.name.slice(0, 70)} (${result.price}€, ${result.source})`,
      );
    } catch (err) {
      result = {
        id: product.id,
        name: product.name,
        status: 'failed',
        reason: err.message,
      };
      console.error(`${label} ❌ ${product.name.slice(0, 70)}`);
      console.error(`     ${err.message}`);
    }
    results.push(result);
    if (i < products.length - 1) await sleep(RATE_LIMIT_DELAY_MS);
  }

  // Summary
  const summary = {
    total: results.length,
    created: results.filter((r) => r.status === 'created').length,
    updated: results.filter((r) => r.status === 'updated').length,
    failed: results.filter((r) => r.status === 'failed').length,
  };
  console.log('\n═══════════════════════════════════════════');
  console.log('📊 SYNC SUMMARY');
  console.log('═══════════════════════════════════════════');
  console.log(summary);
  console.log();

  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
