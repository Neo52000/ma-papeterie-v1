import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';

/**
 * Smoke tests — V1 baseline only. Goal: catch obvious breakages on deploy
 * preview (broken routes, missing hero, JS errors). Phase 2 will add deeper
 * flows (cart, checkout, devis B2B) once F4/F7 stabilise.
 *
 * Console errors are logged but don't fail the run — production browsers emit
 * benign errors (extension noise, CSP reports) that we don't want gating CI.
 * If we ever need a strict guard, scope it to specific patterns.
 */

function attachConsoleLogger(page: Page): void {
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      // Surface for debugging without failing the test.
      // eslint-disable-next-line no-console
      console.warn(`[browser console.error] ${msg.text()}`);
    }
  });
}

test.beforeEach(({ page }) => {
  attachConsoleLogger(page);
});

test('home loads with hero + featured products', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1').first()).toBeVisible();
  await expect(page.locator('article.card-product').first()).toBeVisible();
});

test('catalogue loads with filters', async ({ page }) => {
  await page.goto('/catalogue');
  await expect(page.getByRole('heading', { level: 1, name: /catalogue/i })).toBeVisible();
  await expect(page.locator('form').first()).toBeVisible();
  await expect(page.locator('article.card-product').first()).toBeVisible();
});

test('product detail navigates from catalogue', async ({ page }) => {
  await page.goto('/catalogue');
  const firstProductLink = page.locator('article.card-product a[href^="/produit/"]').first();
  await firstProductLink.click();
  await expect(page).toHaveURL(/\/produit\//);
  await expect(page.locator('h1').first()).toBeVisible();

  // Fiche produit always exposes one of: add-to-cart button, devis CTA, or
  // "Achat en ligne disponible bientôt" placeholder. Soft union assertion.
  const ctas = page.locator('button[type="button"], a[href*="/devis"], a[href="/contact"]');
  await expect(ctas.first()).toBeVisible();
});

test('404 shows recovery CTAs', async ({ page }) => {
  const response = await page.goto('/this-doesnt-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByText(/404|introuvable/i).first()).toBeVisible();
  await expect(page.locator('input[type=search]').first()).toBeVisible();
});
