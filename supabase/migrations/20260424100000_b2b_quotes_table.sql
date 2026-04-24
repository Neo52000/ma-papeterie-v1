-- b2b_quotes : soumissions formulaire /devis (F7)
-- Aligné avec le type B2BQuote dans src/types/database.ts.
CREATE TABLE IF NOT EXISTS public.b2b_quotes (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name   text         NOT NULL,
  siret          text,
  contact_name   text         NOT NULL,
  email          text         NOT NULL,
  phone          text,
  message        text         NOT NULL,
  attachment_url text,
  status         text         NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','in_progress','answered','archived')),
  source         text         NOT NULL DEFAULT 'devis_form_b2b',
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.b2b_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON public.b2b_quotes
  FOR ALL USING (false);

CREATE INDEX b2b_quotes_created_at_idx ON public.b2b_quotes (created_at DESC);
CREATE INDEX b2b_quotes_status_idx ON public.b2b_quotes (status) WHERE status IN ('pending','in_progress');

CREATE TRIGGER b2b_quotes_set_updated_at
  BEFORE UPDATE ON public.b2b_quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.b2b_quotes IS
  'B2B quote requests from /devis form. Lead capture for companies needing large-volume orders.';
COMMENT ON COLUMN public.b2b_quotes.siret IS
  'French company registration number. Nullable for prospects without SIRET.';
COMMENT ON COLUMN public.b2b_quotes.source IS
  'Traffic source tracking. Currently "devis_form_b2b", extensible for future channels (email, B2B portal, etc.).';
