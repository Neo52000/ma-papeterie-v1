// Shared cron authentication. The CRON_SECRET is a long random shared
// string (set on Netlify + GitHub Actions secrets) sent in the
// `x-cron-secret` header of every scheduled POST.
//
// We compare via crypto.timingSafeEqual on raw byte buffers — `!==`
// short-circuits at the first differing character, which leaks the
// header position of the first mismatch and lets an attacker
// brute-force one byte at a time given enough requests. This is a
// theoretical concern (the comparison happens behind Netlify's edge,
// network jitter dominates), but the helper is one line so it's cheap
// to do correctly and consistently across all crons.

import crypto from 'node:crypto';

/**
 * Returns true iff `received` matches `expected`. Returns false (never
 * throws) if either side is missing/empty or lengths don't line up.
 * Constant-time when both buffers are the same length.
 */
export function isAuthorizedCron(received: string | null, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
