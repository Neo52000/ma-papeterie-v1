-- Migration alignement schéma : 4 colonnes shopify_* existent déjà en DB
-- (créées hors repo avant le 2026-04-21). Cette migration documente l'état
-- via IF NOT EXISTS pour reproductibilité Git, et ajoute l'index variant manquant.

-- Colonnes existantes (no-op si déjà présentes)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS shopify_product_id text,
  ADD COLUMN IF NOT EXISTS shopify_variant_id text,
  ADD COLUMN IF NOT EXISTS shopify_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS shopify_inventory_item_id text;

-- Index manquant pour les lookups par variant (utilisé par webhooks Shopify)
CREATE INDEX IF NOT EXISTS idx_products_shopify_variant
  ON products(shopify_variant_id)
  WHERE shopify_variant_id IS NOT NULL;

-- Documentation des colonnes (no-op si déjà documentées)
COMMENT ON COLUMN products.shopify_product_id IS
  'gid://shopify/Product/XXXXX. Identifiant Shopify du produit parent.
   Renseigné par Edge Function import-products-to-shopify ou sync nightly.';

COMMENT ON COLUMN products.shopify_variant_id IS
  'gid://shopify/ProductVariant/XXXXX. Utilisé pour cart/checkout API Storefront
   (cartLinesAdd, etc.). Indexé pour lookups inverses depuis webhooks.';

COMMENT ON COLUMN products.shopify_synced_at IS
  'Timestamp du dernier sync vers Shopify. NULL = jamais sync.
   Utilisé pour identifier les produits à re-sync (drift detection).';

COMMENT ON COLUMN products.shopify_inventory_item_id IS
  'gid://shopify/InventoryItem/XXXXX. Utilisé pour API Shopify Inventory
   (Phase 4: stocks bidirectional sync entre Supabase virtual_stock et
   Shopify inventory levels par location).';
