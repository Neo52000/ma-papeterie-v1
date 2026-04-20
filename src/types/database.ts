// Supabase schema types — regenerate via `npm run gen:types` once CLI is wired.
// These stubs cover the tables listed in SPEC-V1 §7 (existing backend to preserve).

export interface Database {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Product>;
      };
      product_stocks: {
        Row: ProductStock;
        Insert: Omit<ProductStock, 'id' | 'updated_at'>;
        Update: Partial<ProductStock>;
      };
      product_images: {
        Row: ProductImage;
        Insert: Omit<ProductImage, 'id' | 'created_at'>;
        Update: Partial<ProductImage>;
      };
      product_descriptions: {
        Row: ProductDescription;
        Insert: Omit<ProductDescription, 'id' | 'created_at'>;
        Update: Partial<ProductDescription>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at'>;
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
  reference: string;
  name: string;
  slug: string;
  category_id: string | null;
  brand: string | null;
  price_ht: number;
  vat_rate: number;
  created_at: string;
  updated_at: string;
}

export interface ProductStock {
  id: string;
  product_id: string;
  quantity: number;
  location: 'warehouse' | 'store' | 'supplier';
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  position: number;
  alt_text: string | null;
  created_at: string;
}

export interface ProductDescription {
  id: string;
  product_id: string;
  short: string | null;
  long: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  created_at: string;
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
