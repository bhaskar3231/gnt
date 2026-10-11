import { test, expect } from '@playwright/test';
import { signIn, clearSession, BASE } from './helpers';

const needsAuth = !process.env.E2E_USER_EMAIL;

test.describe('Order Tracking (/orders/[id]/tracking)', () => {
  test('tracking page redirects unauthenticated users gracefully', async ({ page }) => {
    // Navigate first so localStorage is accessible, then clear session
    await page.goto(`${BASE}/`);
    await clearSession(page);
    // Use a valid-format but non-existent ObjectId
    await page.goto(`${BASE}/orders/000000000000000000000000/tracking`);
    await expect(page.locator('body')).toBeVisible();
    const crashCount = await page.getByText(/application error/i).count();
    expect(crashCount).toBe(0);
  });

  test('tracking page renders status stepper for authenticated user with an order', async ({ page }) => {
    test.skip(needsAuth, 'Set E2E_USER_EMAIL + E2E_USER_PASSWORD to run auth tests');

    await signIn(page);

    // Navigate to order history to find an existing order
    await page.goto(`${BASE}/account/orders`);
    await expect(page.getByRole('heading', { name: /my orders/i })).toBeVisible({ timeout: 10_000 });

    // Find the first "Track" link on the page
    const trackLink = page.getByRole('link', { name: /^track$/i }).first();
    const count = await trackLink.count();
    test.skip(count === 0, 'No orders yet — place one first to run this test');

    await trackLink.click();
    await page.waitForURL(/\/tracking$/, { timeout: 10_000 });

    // Status stepper should be visible — at minimum the "Confirmed" step label
    await expect(
      page.getByText(/confirmed/i).first()
    ).toBeVisible({ timeout: 8_000 });

    // Order items section should be visible
    await expect(
      page.getByText(/order items/i)
    ).toBeVisible({ timeout: 8_000 });

    // Tracking events section should be visible
    await expect(
      page.getByText(/tracking events/i)
    ).toBeVisible({ timeout: 8_000 });

    // Delivery address section should be visible
    await expect(
      page.getByText(/delivery address/i)
    ).toBeVisible({ timeout: 8_000 });
  });

  test('Track Order link is visible on the order detail page', async ({ page }) => {
    test.skip(needsAuth, 'Set E2E_USER_EMAIL + E2E_USER_PASSWORD to run auth tests');

    await signIn(page);

    await page.goto(`${BASE}/account/orders`);
    await expect(page.getByRole('heading', { name: /my orders/i })).toBeVisible({ timeout: 10_000 });

    // Navigate to the first order's detail page
    const viewLink = page.getByRole('link', { name: /view order/i }).first();
    const count = await viewLink.count();
    test.skip(count === 0, 'No orders yet — place one first to run this test');

    await viewLink.click();
    await page.waitForURL(/\/orders\/[^/]+$/, { timeout: 10_000 });

    // "Track Order" button should appear in the header
    await expect(
      page.getByRole('link', { name: /track order/i })
    ).toBeVisible({ timeout: 8_000 });
  });
});
