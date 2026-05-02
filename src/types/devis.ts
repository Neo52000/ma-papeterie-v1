// Shared types + labels for the B2B quote (b2b_quotes) admin surface.
// DevisList and DevisDetail used to each define their own STATUS_LABELS
// + status union — adding a new status (e.g. 'cancelled') required
// touching both files in sync, easy to miss.

export const DEVIS_STATUSES = ['pending', 'in_progress', 'answered', 'archived'] as const;
export type DevisStatus = (typeof DEVIS_STATUSES)[number];

export const DEVIS_STATUS_LABELS: Record<DevisStatus, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  answered: 'Répondu',
  archived: 'Archivé',
};

export const DEVIS_STATUS_TONES: Record<DevisStatus, string> = {
  pending: 'bg-accent/10 text-accent ring-1 ring-accent/30',
  in_progress: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  answered: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  archived: 'bg-primary/5 text-primary/50 ring-1 ring-primary/10',
};

export interface DevisRow {
  id: string;
  created_at: string;
  company_name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  message: string;
  status: DevisStatus;
}

export interface DevisDetail extends DevisRow {
  updated_at: string;
  siret: string | null;
  attachment_url: string | null;
  source: string | null;
}
