// Server-side logger wrapper. Single layer of indirection — plug Sentry /
// Pino / Datadog by editing this file, never the call sites.
//
// Behaviour:
//  - Always writes to stderr so Netlify Functions logs stay populated for
//    quick triage in the Netlify UI (cheap + always-on, doesn't depend on
//    PUBLIC_SENTRY_DSN being set).
//  - When @sentry/astro is initialised (via astro.config.mjs gated on
//    PUBLIC_SENTRY_DSN), also forwards the error to Sentry with the scope
//    + message attached as tags. The forward is fire-and-forget; if Sentry
//    isn't loaded (dev local with no DSN), we silently skip and only the
//    stderr line happens.
//
// Usage:
//   import { logError } from '@/lib/logger';
//   try { ... } catch (err) {
//     logError('demande-devis', 'DB upsert failed', err);
//     return redirect('/devis/?erreur=1');
//   }

export function logError(scope: string, message: string, err?: unknown): void {
  const detail = err instanceof Error ? (err.stack ?? err.message) : String(err ?? '');
  process.stderr.write(`[${scope}] ${message}${detail ? `: ${detail}` : ''}\n`);

  // Forward to Sentry when initialised. Imported dynamically so the module
  // graph doesn't load Sentry on platforms / dev runs where it isn't wired
  // (PUBLIC_SENTRY_DSN unset → astro.config.mjs skips the integration).
  // The dynamic import resolves to the static module the bundler already
  // ships (no extra round trip), and a missing init is handled by Sentry's
  // own getCurrentHub().getClient() returning undefined.
  void import('@sentry/astro')
    .then((Sentry) => {
      if (typeof Sentry.getClient !== 'function' || !Sentry.getClient()) return;
      Sentry.withScope((scopeCtx) => {
        scopeCtx.setTag('logger.scope', scope);
        scopeCtx.setExtra('logger.message', message);
        if (err instanceof Error) {
          Sentry.captureException(err);
        } else {
          Sentry.captureMessage(`${scope}: ${message}`, 'error');
        }
      });
    })
    .catch(() => {
      /* @sentry/astro not resolvable (test runner, edge env) — stderr already
         carries the error, swallow silently. */
    });
}
