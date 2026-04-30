import type { APIRoute } from 'astro';
import { supabaseServer } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-api';

export const prerender = false;

interface CheckResult {
  id: string;
  label: string;
  status: 'ok' | 'warn' | 'fail' | 'pending';
  detail: string;
  threshold?: string;
}

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const GET: APIRoute = async ({ request }) => {
  const gate = await requireAdmin(request);
  if (gate instanceof Response) return gate;

  const checks: CheckResult[] = [];

  // 1. Sync Shopify %
  const [{ data: syncCountData }, { data: totalCountData }] = await Promise.all([
    supabaseServer
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_vendable', true)
      .not('shopify_variant_id', 'is', null),
    supabaseServer.rpc('count_displayable_products'),
  ]);
  const synced = (syncCountData as unknown as { count?: number })?.count ?? 0;
  const total = typeof totalCountData === 'number' ? totalCountData : Number(totalCountData ?? 0);
  const syncPct = total > 0 ? Math.round((100 * synced) / total) : 0;
  checks.push({
    id: 'sync_shopify',
    label: 'Sync Shopify',
    status: syncPct >= 80 ? 'ok' : syncPct >= 30 ? 'warn' : 'fail',
    detail: `${synced.toLocaleString('fr-FR')} / ${total.toLocaleString('fr-FR')} (${syncPct}%)`,
    threshold: '≥ 80% pour cutover',
  });

  // 2. Env vars Netlify (server-side check via process.env)
  const envChecks = [
    { id: 'PUBLIC_SUPABASE_URL', critical: true },
    { id: 'SUPABASE_SERVICE_ROLE_KEY', critical: true },
    { id: 'PUBLIC_SHOPIFY_DOMAIN', critical: true },
    { id: 'PUBLIC_SHOPIFY_STOREFRONT_TOKEN', critical: true },
    { id: 'SHOPIFY_ADMIN_ACCESS_TOKEN', critical: true },
    { id: 'SHOPIFY_WEBHOOK_SECRET', critical: true },
    { id: 'BREVO_API_KEY', critical: true },
    { id: 'PUBLIC_SITE_URL', critical: true },
    { id: 'CRON_SECRET', critical: false },
    { id: 'BREVO_ABANDONED_CART_TEMPLATE_ID', critical: false },
    { id: 'BREVO_BACK_IN_STOCK_TEMPLATE_ID', critical: false },
    { id: 'BREVO_NEWSLETTER_LIST_ID', critical: false },
    { id: 'PUBLIC_SENTRY_DSN', critical: false },
    { id: 'OPENAI_API_KEY', critical: false },
  ];
  for (const env of envChecks) {
    const present = !!import.meta.env[env.id];
    checks.push({
      id: `env_${env.id}`,
      label: env.id,
      status: present ? 'ok' : env.critical ? 'fail' : 'warn',
      detail: present
        ? '✓ configurée'
        : env.critical
          ? 'Manquante (critique)'
          : 'Optionnelle (feature gated)',
    });
  }

  // 3. Site URL pointant vers prod (ma-papeterie.fr ou netlify.app)
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? '';
  checks.push({
    id: 'site_url',
    label: 'PUBLIC_SITE_URL',
    status: siteUrl.includes('ma-papeterie.fr')
      ? 'ok'
      : siteUrl.includes('netlify.app')
        ? 'warn'
        : 'fail',
    detail: siteUrl || '(non configurée)',
    threshold: 'doit pointer ma-papeterie.fr au cutover',
  });

  // 4. Webhook Shopify orders : check qu'on a au moins reçu une commande
  // récente (= signe que le webhook fonctionne).
  const { count: ordersCount } = await supabaseServer
    .from('shopify_orders')
    .select('id', { count: 'exact', head: true })
    .gte('shopify_created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  checks.push({
    id: 'orders_pipeline',
    label: 'Pipeline commandes (7j)',
    status: (ordersCount ?? 0) > 0 ? 'ok' : 'warn',
    detail: `${ordersCount ?? 0} commandes reçues via webhook`,
    threshold: 'commande test E2E avant cutover',
  });

  // 5. Admin users count (qu'on n'est pas seul, sécu pour bus factor)
  const { count: adminCount } = await supabaseServer
    .from('admin_users')
    .select('user_id', { count: 'exact', head: true });
  checks.push({
    id: 'admin_redundancy',
    label: 'Admins enregistrés',
    status: (adminCount ?? 0) >= 2 ? 'ok' : 'warn',
    detail: `${adminCount ?? 0} admin(s)`,
    threshold: '≥ 2 recommandé (bus factor)',
  });

  // 6. Embeddings backfill % (B2 reco IA)
  const { count: embeddingsCount } = await supabaseServer
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('is_vendable', true)
    .not('embedding', 'is', null);
  const embeddingsPct = total > 0 ? Math.round((100 * (embeddingsCount ?? 0)) / total) : 0;
  checks.push({
    id: 'embeddings_backfill',
    label: 'Embeddings IA (reco)',
    status: embeddingsPct >= 50 ? 'ok' : embeddingsPct >= 10 ? 'warn' : 'pending',
    detail: `${embeddingsCount ?? 0} / ${total} (${embeddingsPct}%)`,
    threshold: 'JIT par défaut, backfill optionnel',
  });

  return json(200, { checks });
};
