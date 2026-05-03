---
module: SEARCH-INTELLIGENCE
projet: ma-papeterie.fr
version: 1.0
durée_totale: ~7 sessions de 30min (3 sprints)
prérequis: Migration Astro NON-BLOQUANTE pour ce module (capture côté JS, indépendant du SSR)
livrables:
  - Sprint 1: Capture des intentions (J1-J3)
  - Sprint 2: Détection des gaps + dashboard admin (J4-J5)
  - Sprint 3: Optimisation IA semi-auto (J6+)
revenue_potentiel:
  - Interne ma-papeterie.fr: +3-8% conversion sur fiches optimisées
  - SaaS revendable: 49-99 €/mois × N clients
---

# 🔍 SEARCH INTELLIGENCE — Architecture C complète

## 🎯 Vision en une phrase

> Capter ce que tes clients cherchent vraiment → identifier les gaps → optimiser les fiches qui matchent, avec validation humaine systématique.

## 🏗️ Architecture finale

```
┌──────────────────────────────────────────────────────────┐
│ COUCHE 1 — CAPTURE (Sprint 1)                            │
│ Hook React → Edge Function track-search → Supabase       │
│ + Vérif cookie consent + Hash session anonyme + Rate limit │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ COUCHE 2 — DÉTECTION GAPS (Sprint 2)                     │
│ Vues SQL agrégées → Dashboard admin /admin/search-insights │
│ → Export CSV + Bouton "Générer prompt optimisation"       │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ COUCHE 3 — OPTIMISATION (Sprint 3)                       │
│ Edge Function rewrite-product-page (Claude API)           │
│ → UI diff côte-à-côte → Validation 1-clic → Push Shopify │
│ → A/B test 14j (50/50) → Garde le gagnant                │
└──────────────────────────────────────────────────────────┘
```

---

# 🚀 SPRINT 1 — Capture des intentions (3 sessions × 30min)

## Session 1 — Migration SQL

**Fichier** : `supabase/migrations/YYYYMMDD_search_intelligence.sql`

```sql
-- ============================================================
-- SEARCH INTELLIGENCE — Couche 1 : capture des recherches
-- Conformité RGPD : pas d'IP, pas d'email, hash session rotaté
-- ============================================================

CREATE TABLE IF NOT EXISTS public.search_queries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_raw    text NOT NULL,
  query_norm   text NOT NULL, -- lowercase, sans accents, trim
  results_count int NOT NULL DEFAULT 0,
  no_result    boolean GENERATED ALWAYS AS (results_count = 0) STORED,

  -- Engagement aval
  clicked_product_id  uuid REFERENCES public.products(id) ON DELETE SET NULL,
  clicked_position    int,
  added_to_cart       boolean DEFAULT false,

  -- Context (RGPD-safe)
  session_hash text NOT NULL,  -- hash anonyme rotaté quotidiennement
  source       text NOT NULL CHECK (source IN ('search_bar','autocomplete','category_filter','url_param')),
  device       text CHECK (device IN ('mobile','desktop','tablet')),
  is_b2b       boolean DEFAULT false,

  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Index analytics (lectures fréquentes)
CREATE INDEX IF NOT EXISTS idx_sq_norm        ON public.search_queries(query_norm);
CREATE INDEX IF NOT EXISTS idx_sq_no_result   ON public.search_queries(no_result) WHERE no_result = true;
CREATE INDEX IF NOT EXISTS idx_sq_created     ON public.search_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sq_clicked     ON public.search_queries(clicked_product_id) WHERE clicked_product_id IS NOT NULL;

-- RLS strict : insertion via Edge Function (service role), lecture admin only
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search_queries_admin_read"
  ON public.search_queries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Pas de policy INSERT publique : forcer le passage par Edge Function

-- Rétention : purge automatique > 90 jours (RGPD minimisation)
-- À planifier dans pg_cron après validation de la couche 2

-- Fonction utilitaire de normalisation (pour l'Edge Function ET le dashboard)
CREATE OR REPLACE FUNCTION public.normalize_query(input text)
RETURNS text AS $$
BEGIN
  RETURN regexp_replace(
    lower(unaccent(coalesce(input, ''))),
    '\s+', ' ', 'g'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Activer unaccent si pas déjà fait
CREATE EXTENSION IF NOT EXISTS unaccent;
```

**Test post-migration** :

```sql
SELECT public.normalize_query('Stylo BIC  Cristal  bleu');
-- attendu : 'stylo bic cristal bleu'
```

---

## Session 2 — Edge Function `track-search`

**Fichier** : `supabase/functions/track-search/index.ts`

```typescript
// supabase/functions/track-search/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface TrackPayload {
  query: string;
  resultsCount: number;
  source: 'search_bar' | 'autocomplete' | 'category_filter' | 'url_param';
  sessionHash: string;
  device?: 'mobile' | 'desktop' | 'tablet';
  isB2b?: boolean;
}

// Rate limit en mémoire (par session_hash, 30 req/min max)
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimit.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_MAX) return false;
  entry.count++;
  return true;
}

// Filtre bot basique (User-Agent)
function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return /bot|crawl|spider|scraper|facebookexternalhit|preview/i.test(userAgent);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Filtre bots
    if (isBot(req.headers.get('user-agent'))) {
      return new Response(JSON.stringify({ skipped: 'bot' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as TrackPayload;

    // Validation minimale (zéro confiance côté client)
    if (!body.query || typeof body.query !== 'string') {
      return new Response(JSON.stringify({ error: 'invalid_query' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (body.query.length > 200) {
      return new Response(JSON.stringify({ error: 'query_too_long' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!body.sessionHash || body.sessionHash.length < 16) {
      return new Response(JSON.stringify({ error: 'invalid_session' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting
    if (!checkRateLimit(body.sessionHash)) {
      return new Response(JSON.stringify({ error: 'rate_limited' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Normalisation côté DB (cohérence avec la Vue Sprint 2)
    const { data: normData, error: normErr } = await supabase.rpc('normalize_query', {
      input: body.query,
    });

    if (normErr) throw normErr;

    const { error: insertErr } = await supabase.from('search_queries').insert({
      query_raw: body.query.slice(0, 200),
      query_norm: normData,
      results_count: Math.max(0, Math.min(9999, body.resultsCount ?? 0)),
      source: body.source,
      session_hash: body.sessionHash,
      device: body.device ?? null,
      is_b2b: body.isB2b ?? false,
    });

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[track-search] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'internal' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
```

**Déploiement** :

```bash
supabase functions deploy track-search --no-verify-jwt
```

> ⚠️ `--no-verify-jwt` car l'appel vient du client anonyme (pas de session auth obligatoire).

---

## Session 3 — Hook React + intégration

**Fichier** : `src/hooks/useSearchTracking.ts`

```typescript
import { useCallback, useRef } from 'react';

const TRACK_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-search`;
const SESSION_KEY = 'mp_session_hash';

// Hash de session anonyme, rotaté toutes les 24h
function getSessionHash(): string {
  const stored = localStorage.getItem(SESSION_KEY);
  if (stored) {
    const [hash, expiresAt] = stored.split('|');
    if (Number(expiresAt) > Date.now()) return hash;
  }
  // Génération nouveau hash
  const newHash = crypto.randomUUID().replace(/-/g, '');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  localStorage.setItem(SESSION_KEY, `${newHash}|${expiresAt}`);
  return newHash;
}

function detectDevice(): 'mobile' | 'desktop' | 'tablet' {
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad/.test(ua)) return 'tablet';
  if (/mobile|android|iphone/.test(ua)) return 'mobile';
  return 'desktop';
}

// Vérifie le consent analytics (à adapter selon ton système de cookies)
function hasAnalyticsConsent(): boolean {
  try {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) return false;
    const parsed = JSON.parse(consent);
    return parsed?.analytics === true;
  } catch {
    return false;
  }
}

interface TrackArgs {
  query: string;
  resultsCount: number;
  source: 'search_bar' | 'autocomplete' | 'category_filter' | 'url_param';
  isB2b?: boolean;
}

export function useSearchTracking() {
  const lastTrackedRef = useRef<string>('');

  const trackSearch = useCallback(async (args: TrackArgs) => {
    // Bypass si pas de consent
    if (!hasAnalyticsConsent()) return;

    // Bypass si query vide ou trop courte
    if (!args.query || args.query.trim().length < 2) return;

    // Dédoublonnage : ne pas tracker 2x la même query en < 3s
    const dedupKey = `${args.query}|${args.source}`;
    if (lastTrackedRef.current === dedupKey) return;
    lastTrackedRef.current = dedupKey;
    setTimeout(() => {
      lastTrackedRef.current = '';
    }, 3000);

    try {
      await fetch(TRACK_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          query: args.query.trim(),
          resultsCount: args.resultsCount,
          source: args.source,
          sessionHash: getSessionHash(),
          device: detectDevice(),
          isB2b: args.isB2b ?? false,
        }),
        keepalive: true, // continue même si user navigue
      });
    } catch (err) {
      // Tracking ne doit JAMAIS bloquer l'UX
      console.warn('[useSearchTracking] track failed (non-blocking):', err);
    }
  }, []);

  return { trackSearch };
}
```

**Intégration dans `src/components/search/SearchBar.tsx`** (adapter selon ton composant existant) :

```typescript
import { useSearchTracking } from '@/hooks/useSearchTracking';

export function SearchBar() {
  const { trackSearch } = useSearchTracking();
  // ... ton code existant

  const handleSubmit = async (query: string) => {
    const results = await searchProducts(query);

    // 🆕 Tracking après réception des résultats
    trackSearch({
      query,
      resultsCount: results.length,
      source: 'search_bar',
    });

    // ... navigation vers résultats
  };
}
```

**Test fin Sprint 1** :

```sql
SELECT query_raw, query_norm, results_count, source, created_at
FROM public.search_queries
ORDER BY created_at DESC
LIMIT 10;
```

→ Si tu vois tes propres recherches s'inscrire, **Sprint 1 validé**. Laisser tourner 7 jours minimum avant Sprint 2.

---

# 📊 SPRINT 2 — Détection des gaps + dashboard admin (2 sessions)

> ⏱️ **À démarrer après 7 jours minimum de capture** (sinon données insuffisantes pour stats fiables).

## Session 4 — Vues SQL analytics

**Fichier** : `supabase/migrations/YYYYMMDD_search_insights_views.sql`

```sql
-- Vue 1 : queries sans résultat (top opportunités)
CREATE OR REPLACE VIEW public.v_search_no_results AS
SELECT
  query_norm,
  count(*)::int as occurrences,
  count(DISTINCT session_hash)::int as unique_sessions,
  max(created_at) as last_seen,
  array_agg(DISTINCT query_raw) as raw_variations
FROM public.search_queries
WHERE created_at > now() - interval '30 days'
  AND no_result = true
GROUP BY query_norm
HAVING count(*) >= 2
ORDER BY occurrences DESC, last_seen DESC;

-- Vue 2 : queries avec résultats mais 0 clic (mauvais titres / mauvaise pertinence)
CREATE OR REPLACE VIEW public.v_search_low_ctr AS
SELECT
  query_norm,
  count(*)::int as searches,
  count(*) FILTER (WHERE clicked_product_id IS NOT NULL)::int as clicks,
  ROUND(
    100.0 * count(*) FILTER (WHERE clicked_product_id IS NOT NULL) / count(*),
    2
  ) as ctr_pct,
  avg(results_count)::int as avg_results
FROM public.search_queries
WHERE created_at > now() - interval '30 days'
  AND no_result = false
GROUP BY query_norm
HAVING count(*) >= 5
   AND (count(*) FILTER (WHERE clicked_product_id IS NOT NULL))::float / count(*) < 0.15
ORDER BY searches DESC;

-- Vue 3 : produits qui apparaissent en résultat mais ne sont jamais cliqués
CREATE OR REPLACE VIEW public.v_invisible_products AS
SELECT
  p.id,
  p.title,
  p.slug,
  count(DISTINCT sq.query_norm) as appears_in_searches,
  count(*) FILTER (WHERE sq.clicked_product_id = p.id) as direct_clicks
FROM public.products p
LEFT JOIN public.search_queries sq
  ON sq.created_at > now() - interval '30 days'
  AND sq.results_count > 0
WHERE p.status = 'active'
GROUP BY p.id, p.title, p.slug
HAVING count(*) FILTER (WHERE sq.clicked_product_id = p.id) = 0
ORDER BY appears_in_searches DESC
LIMIT 100;

-- Vue 4 : trend hebdomadaire (sparkline dashboard)
CREATE OR REPLACE VIEW public.v_search_trend_weekly AS
SELECT
  date_trunc('day', created_at)::date as day,
  count(*)::int as total_searches,
  count(*) FILTER (WHERE no_result)::int as no_results,
  count(DISTINCT session_hash)::int as unique_sessions
FROM public.search_queries
WHERE created_at > now() - interval '30 days'
GROUP BY date_trunc('day', created_at)
ORDER BY day;
```

---

## Session 5 — Dashboard admin React

**Fichier** : `src/pages/admin/SearchInsightsPage.tsx`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Search, TrendingDown, EyeOff, Download, Sparkles } from 'lucide-react';
import { useState } from 'react';

export default function SearchInsightsPage() {
  const noResults = useQuery({
    queryKey: ['search-no-results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_search_no_results')
        .select('*')
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const lowCtr = useQuery({
    queryKey: ['search-low-ctr'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_search_low_ctr')
        .select('*')
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const trend = useQuery({
    queryKey: ['search-trend'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_search_trend_weekly')
        .select('*');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60_000,
  });

  const generateOptimizationPrompt = (queries: string[]) => {
    const prompt = `# Mission : optimisation fiches produits ma-papeterie.fr

Voici ${queries.length} requêtes clients récurrentes sans résultat sur les 30 derniers jours :
${queries.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

Pour CHAQUE requête, propose :
1. Le produit existant le plus probablement recherché (basé sur le contexte papeterie/bureau/scolaire FR)
2. Si le produit n'existe pas au catalogue → recommandation d'ajout fournisseur (Liderpapel/Comlandi)
3. Réécriture du titre actuel pour matcher l'intention client
4. Mots-clés sémantiques manquants à ajouter dans la description

Format de sortie : tableau Markdown.
Règle : aucune supposition floue. Si tu ne peux pas matcher → "Produit absent — ajout suggéré".`;

    navigator.clipboard.writeText(prompt);
    alert('✅ Prompt copié dans le presse-papier. Ouvre Claude et colle-le.');
  };

  const exportCsv = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(r =>
      Object.values(r).map(v =>
        typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v
      ).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Search Intelligence</h1>
          <p className="text-muted-foreground">
            Ce que tes clients cherchent vraiment — 30 derniers jours
          </p>
        </div>
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader>
          <CardTitle>Volume de recherche</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {trend.data && trend.data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend.data}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="total_searches" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="no_results" stroke="hsl(var(--destructive))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Données insuffisantes (minimum 7 jours requis)
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="no-results" className="space-y-4">
        <TabsList>
          <TabsTrigger value="no-results">
            <Search className="w-4 h-4 mr-2" />
            Sans résultat ({noResults.data?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="low-ctr">
            <TrendingDown className="w-4 h-4 mr-2" />
            Faible engagement ({lowCtr.data?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="no-results">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recherches sans résultat</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportCsv(noResults.data ?? [], 'no-results')}
                >
                  <Download className="w-4 h-4 mr-2" /> Export CSV
                </Button>
                <Button
                  size="sm"
                  onClick={() => generateOptimizationPrompt(
                    (noResults.data ?? []).slice(0, 20).map((r: any) => r.query_norm)
                  )}
                >
                  <Sparkles className="w-4 h-4 mr-2" /> Prompt L99
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(noResults.data ?? []).map((row: any) => (
                  <div
                    key={row.query_norm}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{row.query_norm}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.unique_sessions} sessions uniques · dernière {new Date(row.last_seen).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Badge variant="destructive">{row.occurrences}×</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low-ctr">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recherches à faible engagement (CTR &lt; 15%)</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCsv(lowCtr.data ?? [], 'low-ctr')}
              >
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(lowCtr.data ?? []).map((row: any) => (
                  <div
                    key={row.query_norm}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{row.query_norm}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.searches} recherches · {row.avg_results} résultats moyens
                      </p>
                    </div>
                    <Badge variant="secondary">CTR {row.ctr_pct}%</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Routing** : ajouter dans ton router admin :

```typescript
{
  path: '/admin/search-insights',
  lazy: () => import('@/pages/admin/SearchInsightsPage'),
}
```

→ **Validation Sprint 2** : tu ouvres le dashboard, tu vois tes vraies données, tu cliques "Prompt L99" → un prompt prêt est dans ton presse-papier.

---

# 🤖 SPRINT 3 — Optimisation IA semi-auto (à démarrer après 30j de data)

> ⚠️ **Ne pas se précipiter sur ce sprint.** 30 jours de capture = stats fiables = ROI quantifiable. Sans ça, tu construis dans le vide.

## Architecture cible

```
Dashboard admin
   ↓ Bouton "Optimiser avec IA"
Edge Function rewrite-product-page
   ↓ Appelle Claude API avec contexte (query + fiche actuelle + Liderpapel data)
Retour : 3 versions diff (titre / description / Schema.org)
   ↓ UI admin diff côte-à-côte
Validation 1-clic → Push Shopify (via shopifyCartStore patterns existants)
   ↓ A/B test 14j (50/50)
   ↓ Garde le gagnant automatiquement
```

## Squelette Edge Function

**Fichier** : `supabase/functions/rewrite-product-page/index.ts` (à compléter en Sprint 3)

```typescript
// Skeleton seulement — à finaliser après 30j de data
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// TODO Sprint 3 :
// 1. Récupérer fiche produit + données Liderpapel + queries clients liées
// 2. Appel Claude API avec system prompt L99 d'optimisation
// 3. Stocker proposition dans table product_rewrites_pending
// 4. UI admin diff + validation
// 5. Push Shopify GraphQL via patterns shopify-sync existants
// 6. A/B test natif via product metafield 'rewrite_variant'
```

**Table de staging** (à créer en Sprint 3) :

```sql
CREATE TABLE product_rewrites_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  original_title text,
  proposed_title text,
  original_description text,
  proposed_description text,
  proposed_schema_jsonld jsonb,
  matched_queries text[],
  estimated_uplift_pct numeric(5,2),
  status text CHECK (status IN ('pending','approved','rejected','live','retired')),
  ab_test_started_at timestamptz,
  ab_test_winner text CHECK (ab_test_winner IN ('original','proposed','tied') OR ab_test_winner IS NULL),
  created_at timestamptz DEFAULT now(),
  approved_by uuid REFERENCES auth.users(id)
);
```

---

# 💰 NOTES STRATÉGIQUES — Valorisation Prompt Ops / SaaS

## Pour ma-papeterie.fr (interne)

- **Sprint 1+2 = ROI immédiat** : tu sais ce que tu rates, sans IA, sans coût récurrent
- **Sprint 3 = différenciation locale** : tes concurrents Bureau Vallée / Calipage n'ont pas ça
- **KPI à suivre** : evolution du % no-result (cible : -50% en 60 jours)

## Pour le SaaS revendable

- **Pricing cible** : 49 €/mois (jusqu'à 5k searches/mois) → 99 €/mois (illimité + Sprint 3 IA)
- **Pitch** : « Algolia coûte 500 €/mois. Searchanise n'analyse pas en français. Search Intelligence te dit _quoi optimiser_ et _pourquoi_, en français, pour 49 €. »
- **Cible idéale** : e-commerçants Shopify FR avec 1k-50k SKU, sans data scientist
- **Module à packager dans un Prompt Ops Pro à 197€** : Sprint 1+2 livrés clé-en-main + Sprint 3 prompt L99 d'optimisation

## Pré-requis honnêtes avant de commercialiser

1. ✅ 30 jours de tracking sur ma-papeterie.fr (validation interne)
2. ✅ 1 case study chiffrée (avant/après uplift conversion)
3. ✅ Migration Astro terminée (sinon clients verront que ton site lui-même n'est pas indexé → killer commercial)
4. ⚠️ Ne pas vendre Sprint 3 (IA) avant d'avoir validé que les rewrites fonctionnent réellement sur tes propres fiches

---

# ✅ Checklist d'exécution Sprint 1 (à cocher)

```
[ ] J1 — Migration SQL appliquée (search_queries + indexes + RLS)
[ ] J1 — Test normalize_query fonctionne
[ ] J2 — Edge Function track-search déployée
[ ] J2 — Test curl de l'Edge Function (insertion réussie)
[ ] J3 — Hook useSearchTracking créé
[ ] J3 — Intégration dans SearchBar existant
[ ] J3 — Test depuis le site : recherche → ligne dans Supabase
[ ] J3 — Vérif consent cookies bypass correctement
[ ] J3 — Push GitHub via branche feat/search-intelligence-sprint-1
```

→ Une fois Sprint 1 validé en prod, **lancer un timer 7 jours** avant Sprint 2.
