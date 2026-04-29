import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for V1 smoke tests.
 *
 * - Chromium desktop only — Phase 2 will add mobile/firefox/webkit if regression
 *   coverage justifies the CI minutes.
 * - No `webServer` here: CI runs against the Netlify deploy preview URL passed
 *   via `E2E_BASE_URL`. For local dev: `npx astro dev` then run `npm run test:e2e`
 *   with `E2E_BASE_URL=http://localhost:4321`.
 * - Production fallback URL is the V1 preview alias, not the cutover domain.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'https://ma-papeterie-v1.netlify.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
