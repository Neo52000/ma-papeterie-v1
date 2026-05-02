import { useEffect, useState } from 'react';

// Shared fetch+cancel hook for admin React islands. Every list component
// used to repeat the same `let cancelled = false / void fetch().then().catch()
// / return () => { cancelled = true }` block (~18 lines × 7 components).
//
// The hook is deliberately minimal — no SWR/react-query dependency. Admin
// pages are low-traffic, internal, and the cancel pattern is exactly what
// we need (avoid setState after unmount on rapid navigation). If we ever
// need stale-while-revalidate or polling, this is the single place to swap.

export interface AdminFetchResult<T> {
  data: T | null;
  error: string | null;
  /** True until the first fetch resolves (success or failure). Reset to
   *  true when `url` changes, so callers can show a "Chargement…" between
   *  filter swaps without a flash of the previous data. */
  loading: boolean;
}

export function useAdminFetch<T>(
  url: string | null,
  token: string | null,
  /** Extra deps that should re-trigger the fetch. The hook already
   *  re-runs when `url` or `token` change. */
  extraDeps: ReadonlyArray<unknown> = [],
): AdminFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No-op until both url and token are ready (a parent guard typically
    // hands the token down once AdminGuard has resolved auth).
    if (!url || !token) return;
    let cancelled = false;
    setData(null);
    setError(null);
    setLoading(true);
    void fetch(url, { headers: { authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as T;
        setData(json);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, token, ...extraDeps]);

  return { data, error, loading };
}
