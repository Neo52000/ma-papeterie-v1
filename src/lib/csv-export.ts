// Browser-only CSV export helpers. Used by admin surfaces that let SAV /
// compta download a sliced view of a table (waitlist, commandes, …).
//
// RFC 4180-ish escaping: every field is wrapped in double quotes and any
// internal quote is doubled. Without this, an email with a comma or a value
// with a newline silently breaks the CSV layout (one row spread across two,
// columns shifting). Since these files are imported into Brevo / Excel, a
// malformed row = silent data loss.

export const csvEscape = (value: unknown): string => {
  const s = value == null ? '' : String(value);
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
