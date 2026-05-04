// Supabase schema types — aligned with real `public.products` schema
// (cf. docs/PHASE-2-SCHEMA-REPORT.md — 76 colonnes, 141 040 lignes).
//
// Only columns actually read by F1/F2/F3 are typed. Full type generation
// stays a post-V1 concern (see scripts/generate-db-types.sh).

export type Database = {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Product>;
        Relationships: [];
      };
      product_images: {
        Row: ProductImage;
        Insert: Omit<ProductImage, 'id' | 'created_at'>;
        Update: Partial<ProductImage>;
        Relationships: [];
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Category>;
        Relationships: [];
      };
      b2b_quotes: {
        Row: B2BQuote;
        Insert: Omit<B2BQuote, 'id' | 'created_at' | 'updated_at' | 'status' | 'source'>;
        Update: Partial<B2BQuote>;
        Relationships: [];
      };
      school_lists: {
        Row: SchoolList;
        Insert: Omit<SchoolList, 'id' | 'created_at'>;
        Update: Partial<SchoolList>;
        Relationships: [];
      };
      notification_waitlist: {
        Row: NotificationWaitlist;
        // product_id nullable in DB, omitted from Insert defaults so the
        // existing liste-scolaire flow doesn't need to set it explicitly.
        Insert: Omit<NotificationWaitlist, 'id' | 'created_at' | 'product_id'> & {
          product_id?: string | null;
        };
        Update: Partial<NotificationWaitlist>;
        Relationships: [];
      };
      pricing_category_coefficients: {
        Row: PricingCategoryCoefficient;
        Insert: PricingCategoryCoefficient;
        Update: Partial<PricingCategoryCoefficient>;
        Relationships: [];
      };
      shopify_orders: {
        Row: ShopifyOrder;
        // updated_at kept in Insert because upserts MUST set it (Postgres
        // DEFAULT only fires on INSERT, not on ON CONFLICT UPDATE).
        Insert: Omit<ShopifyOrder, 'id' | 'processed_at'>;
        Update: Partial<ShopifyOrder>;
        Relationships: [];
      };
      cart_sessions: {
        Row: CartSession;
        // recovered_at + abandoned_email_sent_at are set later by the
        // abandoned-cart workflow, not at upsert time. created_at uses a
        // Postgres default.
        Insert: Omit<CartSession, 'created_at' | 'recovered_at' | 'abandoned_email_sent_at'>;
        Update: Partial<CartSession>;
        Relationships: [];
      };
      wishlists: {
        Row: Wishlist;
        Insert: Omit<Wishlist, 'id' | 'created_at'>;
        Update: Partial<Wishlist>;
        Relationships: [];
      };
      admin_users: {
        Row: AdminUser;
        Insert: Omit<AdminUser, 'granted_at'>;
        Update: Partial<AdminUser>;
        Relationships: [];
      };
      shopify_customer_links: {
        Row: ShopifyCustomerLink;
        Insert: Omit<ShopifyCustomerLink, 'linked_at'> & { linked_at?: string };
        Update: Partial<ShopifyCustomerLink>;
        Relationships: [];
      };
      search_queries: {
        Row: SearchQuery;
        // clicked_product_id / clicked_position are populated post-insert
        // by /api/search/click; insert payload only carries the search.
        Insert: Omit<
          SearchQuery,
          'id' | 'no_result' | 'created_at' | 'clicked_product_id' | 'clicked_position'
        > & {
          clicked_product_id?: string | null;
          clicked_position?: number | null;
        };
        Update: Partial<SearchQuery>;
        Relationships: [];
      };
    };
    Views: {
      v_search_no_results: {
        Row: SearchNoResultRow;
        Relationships: [];
      };
      v_search_low_ctr: {
        Row: SearchLowCtrRow;
        Relationships: [];
      };
      v_search_trend_daily: {
        Row: SearchTrendRow;
        Relationships: [];
      };
    };
    Functions: {
      compute_display_price: {
        Args: { p_product_id: string };
        Returns: {
          display_price_ttc: number;
          display_price_ht: number;
          compare_at_ttc: number | null;
          source: string;
        }[];
      };
      count_displayable_products: {
        Args: Record<string, never>;
        Returns: number;
      };
      get_public_product_categories: {
        Args: Record<string, never>;
        Returns: string[];
      };
      get_public_product_brands: {
        Args: Record<string, never>;
        Returns: string[];
      };
      is_admin: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      normalize_query: {
        Args: { input: string };
        Returns: string;
      };
      match_products_by_embedding: {
        Args: {
          p_query_embedding: string;
          p_match_count?: number;
          p_exclude_id?: string | null;
        };
        Returns: Array<{ id: string; similarity: number }>;
      };
      search_products_semantic: {
        Args: {
          p_query_embedding: string;
          p_match_count?: number;
        };
        Returns: Array<{ id: string; similarity: number }>;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Product = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  brand: string | null;
  category: string;
  subcategory: string | null;
  ean: string | null;
  manufacturer_code: string | null;
  sku_interne: string | null;
  price: number;
  price_ht: number | null;
  price_ttc: number | null;
  public_price_ttc: number | null;
  // Module Promotions (V2.3) : override admin Shopify-style. NOT NULL =
  // produit en promo, valeur = prix barré à afficher.
  compare_at_ttc: number | null;
  cost_price: number | null;
  manual_price_ht: number | null;
  tva_rate: number | null;
  eco_tax: number | null;
  stock_quantity: number | null;
  stock_online: number | null;
  stock_boutique: number | null;
  sales_channel: 'both' | 'online' | 'pos' | null;
  available_qty_total: number | null;
  is_available: boolean | null;
  is_active: boolean | null;
  is_vendable: boolean | null;
  image_url: string | null;
  badge: string | null;
  is_featured: boolean | null;
  shopify_product_id: string | null;
  shopify_variant_id: string | null;
  shopify_inventory_item_id: string | null;
  shopify_synced_at: string | null;
  // pgvector columns added in B2 — embedding stored as `vector(1536)` in
  // PG, returned as JSON string by PostgREST. Use the helper in
  // `lib/embeddings.ts` to coerce, don't read directly.
  embedding?: string | null;
  embedding_updated_at?: string | null;
  // Multi-fournisseur (Phase C). 'comlandi' par défaut pour rétro-compat.
  supplier?: 'comlandi' | 'alkor' | 'manual';
  supplier_sku?: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  url_originale: string;
  position: number | null;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  level: string;
  parent_id: string | null;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type B2BQuote = {
  id: string;
  company_name: string;
  siret: string | null;
  contact_name: string;
  email: string;
  phone: string | null;
  message: string;
  attachment_url: string | null;
  status: 'pending' | 'in_progress' | 'answered' | 'archived';
  source: string;
  created_at: string;
  updated_at: string;
};

export type SchoolList = {
  id: string;
  user_id: string | null;
  school_level: string | null;
  raw_text: string;
  matched_items: unknown;
  created_at: string;
};

export type NotificationWaitlist = {
  id: string;
  email: string;
  feature: string;
  product_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PricingCategoryCoefficient = {
  category: string;
  coefficient: number;
  strategy: 'A' | 'B' | 'C' | 'fallback';
  updated_at: string;
};

export type ShopifyOrder = {
  id: string;
  shopify_order_id: string;
  shopify_order_number: string;
  shopify_order_name: string;
  // V2.3 linking : Shopify customer numeric ID (TEXT car > 2^31 possible).
  // NULL pour les commandes guest sans compte Shopify.
  shopify_customer_id: string | null;
  customer_email: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_phone: string | null;
  financial_status: string | null;
  fulfillment_status: string | null;
  currency: string;
  subtotal_ttc: number;
  total_tax: number;
  total_shipping: number;
  total_discount: number;
  total_ttc: number;
  line_items: unknown;
  shipping_address: unknown;
  billing_address: unknown;
  raw_payload: unknown;
  shopify_created_at: string;
  processed_at: string;
  updated_at: string;
};

export type CartSession = {
  cart_id: string;
  customer_email: string | null;
  line_items_count: number;
  total_ttc: number;
  currency: string;
  checkout_url: string | null;
  recovered_at: string | null;
  abandoned_email_sent_at: string | null;
  created_at: string;
  last_activity_at: string;
};

export type Wishlist = {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
};

export type AdminUser = {
  user_id: string;
  granted_at: string;
  granted_by: string | null;
  notes: string | null;
};

export type ShopifyCustomerLink = {
  user_id: string;
  shopify_customer_id: string;
  linked_at: string;
  link_method: 'auto_email_match' | 'manual' | 'admin';
};

export type SearchNoResultRow = {
  query_norm: string;
  occurrences: number;
  unique_sessions: number;
  last_seen: string;
  raw_variations: string[];
};

export type SearchLowCtrRow = {
  query_norm: string;
  searches: number;
  clicks: number;
  ctr_pct: number;
  avg_results: number;
  avg_click_position: number | null;
};

export type SearchTrendRow = {
  day: string;
  total_searches: number;
  no_results: number;
  unique_sessions: number;
};

export type SearchQuery = {
  id: string;
  query_raw: string;
  query_norm: string;
  results_count: number;
  no_result: boolean;
  clicked_product_id: string | null;
  clicked_position: number | null;
  session_hash: string;
  source: 'search_bar' | 'autocomplete' | 'category_filter' | 'url_param';
  device: 'mobile' | 'desktop' | 'tablet' | null;
  is_b2b: boolean;
  created_at: string;
};
