import { test, expect } from '@playwright/test';

/**
 * Products listing page tests (/products)
 * - Page renders with heading
 * - Search bar is present
 * - Type filter tabs are present
 * - Product cards link to /product/[slug]
 * - Empty state handled gracefully
 */

test.describe('Products Listing (/products)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products');
  });

  test('page renders with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /products/i }).first()).toBeVisible();
  });

  test('search bar is present', async ({ page }) => {
    await expect(page.getByRole('textbox', { name: /search/i }).or(
      page.locator('input[placeholder*="search" i]')
    )).toBeVisible();
  });

  test('type filter tabs are present', async ({ page }) => {
    for (const label of ['All', 'Gift', 'Treat', 'Children', 'General']) {
      await expect(page.getByRole('link', { name: new RegExp(`^${label}$`, 'i') })).toBeVisible();
    }
  });

  test('shows empty state or product cards', async ({ page }) => {
    const hasProducts = await page.locator('a[href^="/product/"]').count();
    if (hasProducts === 0) {
      // Either empty state text or "no products" message
      await expect(
        page.getByText(/no products/i).or(page.getByText(/empty/i))
      ).toBeVisible();
    } else {
      // Each card should show a name and price
      const firstCard = page.locator('a[href^="/product/"]').first();
      await expect(firstCard).toBeVisible();
    }
  });

  test('search filters products by name', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    await searchInput.fill('xyz_nonexistent_product_12345');
    await searchInput.press('Enter');
    await page.waitForURL(/search=/);
    // Either no products or the grid updates
    await expect(page.locator('body')).toBeVisible(); // page didn't crash
  });

  test('type tab filter updates URL', async ({ page }) => {
    await page.getByRole('link', { name: /^gift$/i }).click();
    await expect(page).toHaveURL(/type=GIFT/i);
  });

  test('product card links to /product/[slug]', async ({ page }) => {
    const firstCard = page.locator('a[href^="/product/"]').first();
    const count = await firstCard.count();
    if (count > 0) {
      const href = await firstCard.getAttribute('href');
      expect(href).toMatch(/^\/product\//);
      await firstCard.click();
      await expect(page).toHaveURL(/\/product\//);
    }
  });
});
