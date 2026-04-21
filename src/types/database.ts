// Supabase schema types — aligned with real `public.products` schema
// (cf. docs/PHASE-2-SCHEMA-REPORT.md — 76 colonnes, 141 040 lignes).
//
// Only columns actually read by F1/F2/F3 are typed. Full type generation
// stays a post-V1 concern (see scripts/generate-db-types.sh).

export interface Database {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Product>;
      };
      product_images: {
        Row: ProductImage;
        Insert: Omit<ProductImage, 'id' | 'created_at'>;
        Update: Partial<ProductImage>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Category>;
      };
      b2b_quotes: {
        Row: B2BQuote;
        Insert: Omit<B2BQuote, 'id' | 'created_at' | 'status'>;
        Update: Partial<B2BQuote>;
      };
      school_lists: {
        Row: SchoolList;
        Insert: Omit<SchoolList, 'id' | 'created_at'>;
        Update: Partial<SchoolList>;
      };
    };
  };
}

export interface Product {
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
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url_originale: string;
  position: number | null;
  created_at: string;
}

export interface Category {
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
}

export interface B2BQuote {
  id: string;
  company_name: string;
  siret: string;
  contact_name: string;
  email: string;
  phone: string | null;
  message: string;
  attachment_url: string | null;
  status: 'pending' | 'in_progress' | 'answered' | 'archived';
  created_at: string;
}

export interface SchoolList {
  id: string;
  user_id: string | null;
  school_level: string | null;
  raw_text: string;
  matched_items: unknown;
  created_at: string;
}
