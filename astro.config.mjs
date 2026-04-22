import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';

// https://astro.build/config
// Sitemap: @astrojs/sitemap removed in Phase 2.5 — replaced by dynamic SSR
// endpoints (src/pages/sitemap-*.xml.ts) that index the ~8k vendable products
// and 50 seeded categories with proper pagination.
export default defineConfig({
  // Switch to https://ma-papeterie.fr on D+16 DNS cutover.
  site: 'https://ma-papeterie-v1.netlify.app',
  output: 'server',
  adapter: netlify({
    edgeMiddleware: false,
  }),
  integrations: [
    react(),
    // applyBaseStyles=false so global.css stays the single source of truth.
    tailwind({ applyBaseStyles: false }),
  ],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    ssr: {
      noExternal: ['@shopify/storefront-api-client'],
    },
  },
});
