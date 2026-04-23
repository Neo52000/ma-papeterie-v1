-- notification_waitlist : inscriptions aux fonctionnalités à venir (F5 liste scolaire, etc.)
CREATE TABLE IF NOT EXISTS public.notification_waitlist (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL,
  feature     text        NOT NULL,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_waitlist_email_feature_key UNIQUE (email, feature)
);

ALTER TABLE public.notification_waitlist ENABLE ROW LEVEL SECURITY;

-- Aucun accès public : lecture/écriture uniquement via service role (API routes)
CREATE POLICY "service_role_only" ON public.notification_waitlist
  FOR ALL USING (false);
