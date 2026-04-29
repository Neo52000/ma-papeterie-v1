-- Per-user wishlist (favorites). One row per (user, product). No quantity —
-- the wishlist is a binary state (saved / not saved). Keep it dead-simple:
-- Shopify cart already handles quantities + variants for the actual purchase.
--
-- RLS: only the authenticated owner can read/write their own rows.

CREATE TABLE IF NOT EXISTS public.wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user
  ON public.wishlists (user_id, created_at DESC);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own wishlist"
  ON public.wishlists
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert into own wishlist"
  ON public.wishlists
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete from own wishlist"
  ON public.wishlists
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.wishlists IS
  'User favorites (one row per user/product). Auth-gated via RLS — only the owner sees their rows.';
