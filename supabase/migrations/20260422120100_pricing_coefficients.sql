-- Pricing policy V1 (bug #2 Phase 2).
--
-- Supplier data (Liderpapel SFTP import) ships a `price_ht` column that is
-- frequently corrupted (e.g. 0.39 € for a product that sells 9.12 TTC). The
-- public catalogue cannot trust this field. V1 rule:
--
--   displayed_ttc = manual_price_ht * 1.20                    -- if manual override set
--                 | cost_price * coefficient_for_category     -- default business rule
--                 | public_price_ttc                          -- legacy fallback
--                 | price_ttc                                 -- last resort
--   displayed_ht  = displayed_ttc / 1.20
--
-- The coefficient table is seeded from an analysis of the 141k Comlandi rows
-- (see docs/PHASE-2-FINDINGS.md). Coefs are grouped in three market strategies:
--   A — commodity  (1.35-1.45)  : consumables, electronics, printer supplies
--   B — differentiation (1.70-1.80) : stationery, school, writing, filing
--   C — service    (1.50-2.00)  : furniture, games, creative, ergonomics
--
-- Floor: 1.32 (= 10% margin on cost after 20% VAT), enforced by CHECK.
-- Override: product.manual_price_ht bypasses the coefficient entirely.

-- 1. Optional manual override column.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS manual_price_ht numeric(10,2);

COMMENT ON COLUMN public.products.manual_price_ht IS
  'Optional manual HT price override. When set, takes priority over cost_price × category coefficient. Used by Élie for hand-curated products.';

-- 2. Coefficient table keyed on products.category (no FK: category is free-form
-- text in products and new categories will fall back to the __default__ row).
CREATE TABLE IF NOT EXISTS public.pricing_category_coefficients (
  category    text PRIMARY KEY,
  coefficient numeric(5,2) NOT NULL CHECK (coefficient >= 1.32),
  strategy    text NOT NULL CHECK (strategy IN ('A', 'B', 'C', 'fallback')),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pricing_category_coefficients IS
  'Per-category markup applied to cost_price to derive public TTC (V1 pricing policy).';

-- 3. Seed the 50 most-populated categories + fallback row.
-- Values reviewed and validated manually on 2026-04-22 against a median-coef
-- analysis of live Comlandi data.
INSERT INTO public.pricing_category_coefficients (category, coefficient, strategy) VALUES
  ('__default__', 1.70, 'fallback'),
  ('Non classé', 1.40, 'A'),
  ('CONSOMMABLES INFORMATIQUES', 1.40, 'A'),
  ('PAPIERS', 1.80, 'B'),
  ('BAGAGERIE ET MAROQUINERIE', 1.80, 'C'),
  ('ACCESSOIRES', 1.70, 'C'),
  ('PEINTURE', 1.85, 'C'),
  ('BLOCS', 1.70, 'B'),
  ('ACCESSOIRES DE BUREAU', 1.80, 'C'),
  ('CLASSEURS', 1.80, 'B'),
  ('CAHIERS SCOLAIRES', 1.70, 'B'),
  ('POCHETTES', 1.70, 'B'),
  ('JEUX', 1.90, 'C'),
  ('STYLOS-BILLES', 1.75, 'B'),
  ('ROLLERS ET STYLOS', 1.70, 'B'),
  ('Toners & tambours, original', 1.45, 'A'),
  ('CLASSEMENT', 1.75, 'B'),
  ('CARNETS ET RÉPERTOIRES', 2.00, 'C'),
  ('MARQUEURS', 1.70, 'B'),
  ('PRÉSENTATION DE DOCUMENTS', 1.80, 'B'),
  ('PRODUITS POUR DÉCORER', 1.80, 'C'),
  ('ADHÉSIFS', 1.45, 'A'),
  ('ENCRE ET CARTOUCHES', 1.40, 'A'),
  ('ECRIRE ET CORRIGER', 1.75, 'B'),
  ('STYLOS-FEUTRES', 1.70, 'B'),
  ('CHEMISES', 1.75, 'B'),
  ('TABLEAUX', 1.70, 'C'),
  ('MACHINES À RELIER', 1.80, 'C'),
  ('PETIT MATERIEL BUREAU ET ECOLE', 1.80, 'B'),
  ('ENVELOPPES', 1.70, 'B'),
  ('SIÉGES', 1.50, 'C'),
  ('GOMMETTES', 1.60, 'C'),
  ('CAHIERS', 1.70, 'B'),
  ('AGRAFEUSES', 1.75, 'B'),
  ('EMBALLAGE', 1.85, 'C'),
  ('COLLES', 1.45, 'A'),
  ('MULTIMÉDIA', 1.40, 'A'),
  ('Chemises & trieurs', 1.70, 'B'),
  ('SURLIGNEURS', 1.70, 'B'),
  ('ENSEMBLES DE BUREAU', 1.70, 'C'),
  ('ÉTIQUETTES', 1.75, 'B'),
  ('SIGNALISATION', 1.75, 'B'),
  ('HYGIÈNE', 1.80, 'C'),
  ('ÉCRITURE PRESTIGE', 1.80, 'B'),
  ('Consommables pour imprimantes jet d''encr', 1.40, 'A'),
  ('Réseau et maison intelligente', 1.35, 'A'),
  ('Machines à relier & accessoires', 2.00, 'C'),
  ('ERGONOMIE', 1.85, 'C'),
  ('Papier copieur et imprimante', 1.35, 'A'),
  ('Impression, numérisation et consommables', 1.40, 'A'),
  ('DESSIN SCOLAIRE ET PROFESSIONNEL', 1.80, 'B')
ON CONFLICT (category) DO NOTHING;

-- 4. RLS — read-only for the anon role (public catalogue needs it); writes
-- restricted to service_role (Supabase Studio / seed).
ALTER TABLE public.pricing_category_coefficients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_coefficients_public_read"
  ON public.pricing_category_coefficients;
CREATE POLICY "pricing_coefficients_public_read"
  ON public.pricing_category_coefficients
  FOR SELECT
  TO anon, authenticated
  USING (true);
