-- Idempotency for the back-in-stock cron.
--
-- Before this migration, the cron flow was: send Brevo email → DELETE row.
-- If the email succeeded but the DELETE failed (network blip, RLS edge case),
-- the row stayed and the next run sent a duplicate email to the same
-- subscriber.
--
-- We now mark the row with notified_at instead of deleting it. The cron's
-- WHERE clause filters on notified_at IS NULL so a marked row never
-- re-enters the candidate set even if the eventual cleanup DELETE fails.
-- A weekly housekeeping query (TODO post-V1) can purge rows older than
-- 30 days for storage hygiene.

ALTER TABLE public.notification_waitlist
  ADD COLUMN IF NOT EXISTS notified_at timestamptz NULL;

COMMENT ON COLUMN public.notification_waitlist.notified_at IS
  'Set when a back-in-stock email was successfully delivered. The cron filters on IS NULL, so this column is the source of truth for "do not send again". Can be reset to NULL to deliberately re-fire (e.g. product back-out, back-in cycle).';

-- Speeds up the cron's hot path: WHERE feature = 'back_in_stock' AND notified_at IS NULL.
CREATE INDEX IF NOT EXISTS idx_notification_waitlist_unsent
  ON public.notification_waitlist (feature, created_at)
  WHERE notified_at IS NULL;
