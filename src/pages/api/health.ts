import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { shopifyFetch } from '@/lib/shopify';

export const prerender = false;

interface HealthResult {
  statut: 'ok' | 'degraded' | 'error';
  vérifications: {
    supabase: { ok: boolean; detail: string };
    shopify: { ok: boolean; detail: string };
  };
  timestamp: string;
}

const SHOP_PING_QUERY = `#graphql
  query ShopPing {
    shop {
      name
      primaryDomain { url }
    }
  }
`;

export const GET: APIRoute = async () => {
  const vérifications: HealthResult['vérifications'] = {
    supabase: { ok: false, detail: 'unchecked' },
    shopify: { ok: false, detail: 'unchecked' },
  };

  try {
    const { error } = await supabaseServer.from('products').select('id').limit(1);
    if (error) throw error;
    vérifications.supabase = { ok: true, detail: 'products table reachable' };
  } catch (err) {
    vérifications.supabase = {
      ok: false,
      detail: err instanceof Error ? err.message : JSON.stringify(err),
    };
  }

  // Shopify Storefront ping. Wrapper reads PUBLIC_SHOPIFY_STOREFRONT_DOMAIN +
  // PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN (32-hex Storefront token, never the
  // shpat_ Admin token — see fix/storefront-token-env-naming).
  // If "Not Found" → check scopes (unauthenticated_read_product_listings,
  // _inventory, _tags) in Shopify Admin > Apps > Develop apps > Storefront API.
  try {
    const data = await shopifyFetch<{ shop: { name: string } }>(SHOP_PING_QUERY);
    vérifications.shopify = { ok: true, detail: `shop: ${data.shop.name}` };
  } catch (err) {
    vérifications.shopify = {
      ok: false,
      detail: err instanceof Error ? err.message : JSON.stringify(err),
    };
  }

  const allOk = vérifications.supabase.ok && vérifications.shopify.ok;
  const anyOk = vérifications.supabase.ok || vérifications.shopify.ok;
  const statut: HealthResult['statut'] = allOk ? 'ok' : anyOk ? 'degraded' : 'error';
  const httpStatus = allOk ? 200 : anyOk ? 207 : 503;

  const body: HealthResult = {
    statut,
    vérifications,
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: httpStatus,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
};
