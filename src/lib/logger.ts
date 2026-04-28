// Server-side logger wrapper. Single layer of indirection so the day we plug
// Sentry / Pino / Datadog we replace the implementation here without touching
// every endpoint. Until then, writes to stderr (Netlify Functions captures
// stderr lines as "ERROR" entries surfaced in the function logs UI).
//
// Usage:
//   import { logError } from '@/lib/logger';
//   try { ... } catch (err) {
//     logError('demande-devis', 'DB upsert failed', err);
//     return redirect('/devis/?erreur=1');
//   }

export function logError(scope: string, message: string, err?: unknown): void {
  const detail = err instanceof Error ? (err.stack ?? err.message) : String(err ?? '');
  // Plain stderr write — equivalent to console.error but goes through one
  // function we own, so swapping in Sentry later is a one-file change.
  process.stderr.write(`[${scope}] ${message}${detail ? `: ${detail}` : ''}\n`);
}
