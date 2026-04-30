-- Admin role table. Élie + tout futur admin manuellement ajouté ici via
-- Supabase Studio (service-role). Pas de UI d'auto-promotion : un admin ne
-- crée pas un autre admin via le site (sinon take-over silencieux possible).

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users (id),
  notes text
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Un admin authentifié peut lire la liste (utilisé par /admin pour
-- afficher les autres admins). Pas d'INSERT/UPDATE/DELETE — service-role only.
CREATE POLICY "Admins read admin_users"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

COMMENT ON TABLE public.admin_users IS
  'Whitelist admins. Service-role only insert. Read-only via RLS pour les admins eux-mêmes.';

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = p_user_id);
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;

COMMENT ON FUNCTION public.is_admin(uuid) IS
  'Boolean check pour le code Astro (server-side). SECURITY DEFINER pour bypass RLS si appelé par anon (e.g. avant connexion).';
