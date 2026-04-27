/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly PUBLIC_SHOPIFY_STOREFRONT_DOMAIN: string;
  readonly PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN: string;
  readonly BREVO_API_KEY: string;
  readonly SHOPIFY_WEBHOOK_SECRET: string;
  readonly PUBLIC_SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
