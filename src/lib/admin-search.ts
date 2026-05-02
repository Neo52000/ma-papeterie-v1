// Helpers for admin-side ilike search via PostgREST .or().
//
// Two transformations apply to user input before it ends up inside an
// `.or('col.ilike.%X%, col.ilike.%X%')` string:
//
// 1. PostgREST .or() filter syntax uses `,` `(` `)` `*` as separators /
//    metacharacters. A literal occurrence inside a value would corrupt
//    the filter and either return wrong rows or HTTP-400. We strip these
//    rather than trying to encode them — the columns we search (emails,
//    names, order numbers, company names) don't carry them in practice.
//
// 2. Postgres ilike treats `%` and `_` as wildcards. Without escaping,
//    a search for `_` matches any single character and `%` matches
//    everything — a feature surprise (admin-only, no security impact)
//    but enough to make the search feel broken when those characters
//    appear in real input. We backslash-escape them; the surrounding
//    `%` we add for partial-match are appended *after* the escape.

const POSTGREST_OR_META = /[,()*]/g;

export const sanitizeForIlikeOr = (input: string): string =>
  input.replace(POSTGREST_OR_META, '').replace(/\\/g, '\\\\').replace(/[%_]/g, '\\$&').trim();
