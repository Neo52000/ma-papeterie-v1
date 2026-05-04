import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/admin-api';
import { supabaseServer } from '@/lib/supabase';
import { logError } from '@/lib/logger';

export const prerender = false;

// GET /api/admin/search-insights — aggregates the three Sprint-2 views into
// a single payload the React dashboard can render in one round trip.
//
// Auth: standard admin bearer (cf. AdminGuard.tsx). Reads the views via
// service-role so they don't need any anon/authenticated grant.

interface NoResultRow {
  query_norm: string;
  occurrences: number;
  unique_sessions: number;
  last_seen: string;
  raw_variations: string[];
}

interface LowCtrRow {
  query_norm: string;
  searches: number;
  clicks: number;
  ctr_pct: number;
  avg_results: number;
  avg_click_position: number | null;
}

interface TrendRow {
  day: string;
  total_searches: number;
  no_results: number;
  unique_sessions: number;
}

const NO_RESULTS_LIMIT = 100;
const LOW_CTR_LIMIT = 100;

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const GET: APIRoute = async ({ request }) => {
  const gate = await requireAdmin(request);
  if (gate instanceof Response) return gate;

  try {
    const [noResults, lowCtr, trend] = await Promise.all([
      supabaseServer
        .from('v_search_no_results')
        .select('query_norm,occurrences,unique_sessions,last_seen,raw_variations')
        .limit(NO_RESULTS_LIMIT),
      supabaseServer
        .from('v_search_low_ctr')
        .select('query_norm,searches,clicks,ctr_pct,avg_results,avg_click_position')
        .limit(LOW_CTR_LIMIT),
      supabaseServer
        .from('v_search_trend_daily')
        .select('day,total_searches,no_results,unique_sessions'),
    ]);

    if (noResults.error) throw noResults.error;
    if (lowCtr.error) throw lowCtr.error;
    if (trend.error) throw trend.error;

    return json(200, {
      noResults: (noResults.data ?? []) as NoResultRow[],
      lowCtr: (lowCtr.data ?? []) as LowCtrRow[],
      trend: (trend.data ?? []) as TrendRow[],
    });
  } catch (err) {
    logError('admin/search-insights', 'aggregation failed', err);
    return json(500, { error: 'internal' });
  }
};
