import { test, expect } from '@playwright/test';

/**
 * Homepage tests
 * - Hero section renders
 * - Navbar is present with expected links
 * - Categories and Featured Products sections load
 */

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders hero section with Shop Now CTA', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /gift & treat/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /shop now/i })).toBeVisible();
  });

  test('Shop Now link navigates to /products', async ({ page }) => {
    await page.getByRole('link', { name: /shop now/i }).click();
    await expect(page).toHaveURL(/\/products/);
  });

  test('navbar renders with logo and Products link', async ({ page }) => {
    const navbar = page.getByRole('navigation');
    await expect(navbar).toBeVisible();
    // Logo
    await expect(navbar.getByText(/gift & treat/i)).toBeVisible();
    // Products link
    await expect(navbar.getByRole('link', { name: /products/i })).toBeVisible();
  });

  test('navbar cart icon is visible', async ({ page }) => {
    // Cart link identified by aria-label or href
    await expect(
      page.getByRole('link', { name: /^cart$/i }).or(
        page.locator('a[href="/cart"]')
      ).first()
    ).toBeVisible();
  });

  test('renders shop by category section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /shop by category/i })).toBeVisible();
  });

  test('renders featured products section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /featured products/i })).toBeVisible();
  });

  test('trust features are visible', async ({ page }) => {
    await expect(page.getByText(/fast delivery/i)).toBeVisible();
    await expect(page.getByText(/quality assured/i)).toBeVisible();
    await expect(page.getByText(/secure checkout/i)).toBeVisible();
  });
});
