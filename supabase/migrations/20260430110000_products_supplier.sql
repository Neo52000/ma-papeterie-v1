-- Phase C foundation : colonne `supplier` pour tracer la source de chaque produit.
-- Permet d'ajouter Alkor (XML EDI) à côté de Comlandi (CSV existant) sans
-- mélanger les inventaires.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS supplier text NOT NULL DEFAULT 'comlandi',
  ADD COLUMN IF NOT EXISTS supplier_sku text;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_supplier_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_supplier_check
  CHECK (supplier IN ('comlandi', 'alkor', 'manual'));

CREATE INDEX IF NOT EXISTS idx_products_supplier ON public.products (supplier);
CREATE INDEX IF NOT EXISTS idx_products_supplier_sku
  ON public.products (supplier, supplier_sku)
  WHERE supplier_sku IS NOT NULL;

COMMENT ON COLUMN public.products.supplier IS
  'Source du produit : comlandi (historique), alkor (V2 EDI), manual (saisie boutique).';
COMMENT ON COLUMN public.products.supplier_sku IS
  'Référence côté fournisseur. Sert de clé de réconciliation lors des syncs.';
