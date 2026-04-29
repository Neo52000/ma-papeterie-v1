-- Track when the abandoned-cart Brevo email was sent so the hourly cron
-- doesn't re-email the same cart twice. Partial index narrows the scan to
-- pending rows only (the typical state count is < 100).

ALTER TABLE public.cart_sessions
  ADD COLUMN IF NOT EXISTS abandoned_email_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_cart_sessions_abandoned_pending
  ON public.cart_sessions (last_activity_at)
  WHERE abandoned_email_sent_at IS NULL
    AND recovered_at IS NULL
    AND customer_email IS NOT NULL;

COMMENT ON COLUMN public.cart_sessions.abandoned_email_sent_at IS
  'Timestamp when the abandoned-cart Brevo email was sent. NULL means not sent yet (eligible for next cron run).';
