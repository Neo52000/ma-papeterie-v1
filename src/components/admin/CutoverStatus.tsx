import { useState } from 'react';
import AdminGuard from './AdminGuard';
import { ChecksListSkeleton } from './AdminSkeletons';
import { useAdminFetch } from '@/lib/admin-fetch';

interface CheckResult {
  id: string;
  label: string;
  status: 'ok' | 'warn' | 'fail' | 'pending';
  detail: string;
  threshold?: string;
}

const ICON: Record<CheckResult['status'], string> = {
  ok: '✓',
  warn: '⚠',
  fail: '✗',
  pending: '○',
};

const STATUS_CLASSES: Record<CheckResult['status'], string> = {
  ok: 'border-green-200 bg-green-50/40 text-green-800',
  warn: 'border-accent/30 bg-accent/5 text-accent',
  fail: 'border-danger/30 bg-danger/5 text-danger',
  pending: 'border-primary/10 bg-bg-soft text-primary/60',
};

export default function CutoverStatus() {
  return <AdminGuard>{({ token }) => <Inner token={token} />}</AdminGuard>;
}

function Inner({ token }: { token: string }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, error } = useAdminFetch<{ checks: CheckResult[] }>(
    '/api/admin/cutover-status',
    token,
    [refreshKey],
  );
  const checks = data?.checks ?? null;

  if (error) {
    return (
      <p className="rounded-card border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        Erreur : {error}
      </p>
    );
  }

  if (!checks) return <ChecksListSkeleton count={8} />;

  const okCount = checks.filter((c) => c.status === 'ok').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;

  const goNoGo = failCount === 0 ? (warnCount === 0 ? 'go' : 'go-warn') : 'no-go';

  return (
    <>
      <div
        className={`mb-6 rounded-card border-2 p-5 ${
          goNoGo === 'go'
            ? 'border-green-300 bg-green-50/60'
            : goNoGo === 'go-warn'
              ? 'border-accent/40 bg-accent/10'
              : 'border-danger/40 bg-danger/10'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary/60">
              Verdict cutover
            </p>
            <p className="mt-1 font-display text-3xl font-bold text-primary">
              {goNoGo === 'go' ? '🚀 GO' : goNoGo === 'go-warn' ? '⚠ GO avec warnings' : '✗ NO-GO'}
            </p>
            <p className="mt-1 text-sm text-primary/70">
              {okCount} OK · {warnCount} warn · {failCount} fail
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex h-9 items-center rounded-btn border border-primary/15 bg-white px-3 text-xs font-medium text-primary hover:border-accent"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {checks.map((check) => (
          <div
            key={check.id}
            className={`flex items-start gap-3 rounded-card border p-3 ${STATUS_CLASSES[check.status]}`}
          >
            <span className="mt-0.5 font-display text-lg font-bold">{ICON[check.status]}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold">{check.label}</p>
              <p className="text-xs opacity-90">{check.detail}</p>
              {check.threshold && (
                <p className="mt-0.5 text-xs italic opacity-70">{check.threshold}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <section className="mt-8 rounded-card border border-primary/10 bg-white p-5 text-sm">
        <h2 className="font-display text-base font-semibold text-primary">Procédure cutover</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-primary/80">
          <li>Vérifier 100% des checks au-dessus = OK ou warn explicable</li>
          <li>Custom domain Netlify → DNS pointing ma-papeterie.fr</li>
          <li>
            Update env <code className="rounded bg-bg-soft px-1">PUBLIC_SITE_URL</code> sur Netlify
            → redeploy
          </li>
          <li>Update Shopify Admin → Checkout → Return URL = https://ma-papeterie.fr/merci</li>
          <li>Update Supabase Auth → Site URL + Redirect URLs (ma-papeterie.fr)</li>
          <li>Smoke test E2E final (parcours achat complet)</li>
          <li>Annonce sur Facebook/Instagram</li>
        </ol>
      </section>
    </>
  );
}
