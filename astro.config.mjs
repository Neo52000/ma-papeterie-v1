import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';
import sentry from '@sentry/astro';

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
    // Sentry integration runs only when PUBLIC_SENTRY_DSN is set, so local
    // dev (no .env value) doesn't ship telemetry calls.
    ...(process.env.PUBLIC_SENTRY_DSN
      ? [
          sentry({
            dsn: process.env.PUBLIC_SENTRY_DSN,
            // Light sampling — V1 is low traffic, no need for 100% perf
            // traces. Bumped later via Sentry UI if needed.
            tracesSampleRate: 0.1,
            replaysSessionSampleRate: 0,
            replaysOnErrorSampleRate: 1.0,
            sourceMapsUploadOptions: {
              project: 'ma-papeterie-web',
              authToken: process.env.SENTRY_AUTH_TOKEN,
            },
          }),
        ]
      : []),
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
