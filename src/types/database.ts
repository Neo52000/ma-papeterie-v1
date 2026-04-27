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
        Insert: Omit<NotificationWaitlist, 'id' | 'created_at'>;
        Update: Partial<NotificationWaitlist>;
        Relationships: [];
      };
      pricing_category_coefficients: {
        Row: PricingCategoryCoefficient;
        Insert: PricingCategoryCoefficient;
        Update: Partial<PricingCategoryCoefficient>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
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
  cost_price: number | null;
  manual_price_ht: number | null;
  tva_rate: number | null;
  eco_tax: number | null;
  stock_quantity: number | null;
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
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PricingCategoryCoefficient = {
  category: string;
  coefficient: number;
  strategy: 'A' | 'B' | 'C' | 'fallback';
  updated_at: string;
};
