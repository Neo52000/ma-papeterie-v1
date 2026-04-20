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
    const { error } = await supabaseServer
      .from('products')
      .select('id')
      .limit(1);
    if (error) throw error;
    vérifications.supabase = { ok: true, detail: 'products table reachable' };
  } catch (err) {
    vérifications.supabase = { ok: false, detail: err instanceof Error ? err.message : JSON.stringify(err) };
  }

  // TODO Phase 3 : Shopify Storefront check fails - à résoudre avant panier/checkout
  //   → https://admin.shopify.com/store/ma-papeterie-pro-boutique-hcd1j/settings/apps/development
  //   → Vérifier scopes: unauthenticated_read_product_listings, _inventory, _tags
  //   → Vérifier que le channel "Online Store" est activé dans Settings > Sales channels
  //   → Token actuel (shpss_...) a le bon préfixe Storefront, mais renvoie "Not Found"
  //   → Attendu: "degraded" status (HTTP 207) tant que non résolu
  try {
    const data = await shopifyFetch<{ shop: { name: string } }>(SHOP_PING_QUERY);
    vérifications.shopify = { ok: true, detail: `shop: ${data.shop.name}` };
  } catch (err) {
    vérifications.shopify = { ok: false, detail: err instanceof Error ? err.message : JSON.stringify(err) };
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
