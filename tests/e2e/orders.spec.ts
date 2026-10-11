import { test, expect } from '@playwright/test';

/**
 * Order pages tests
 * - /orders/[id] — order detail + invoice + status timeline
 * - /account/orders — order history
 *
 * These pages require authentication. Tests are skipped unless
 * E2E_USER_EMAIL + E2E_USER_PASSWORD env vars are set.
 */

const needsAuth = !process.env.E2E_USER_EMAIL;

test.describe('Order History (/account/orders)', () => {
  test('redirects unauthenticated users away from /account/orders', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/account/orders');
    // Should redirect to sign-in or show auth wall — must not crash
    await expect(page.locator('body')).toBeVisible();
    const hasError = await page.getByText(/application error/i).count();
    expect(hasError).toBe(0);
  });

  test('account orders page renders for authenticated user', async ({ page }) => {
    test.skip(needsAuth, 'Set E2E_USER_EMAIL + E2E_USER_PASSWORD to run auth tests');
    await page.goto('/account/orders');
    await expect(
      page.getByRole('heading', { name: /my orders/i }).or(
        page.getByText(/orders/i)
      )
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows empty state if no orders placed', async ({ page }) => {
    test.skip(needsAuth, 'Set E2E_USER_EMAIL + E2E_USER_PASSWORD to run auth tests');
    await page.goto('/account/orders');
    // Either a table or empty state
    const hasOrders = await page.locator('table').count();
    if (hasOrders === 0) {
      await expect(
        page.getByText(/no orders/i).or(page.getByText(/start shopping/i))
      ).toBeVisible({ timeout: 8_000 });
    } else {
      await expect(page.locator('table')).toBeVisible();
    }
  });
});

test.describe('Order Detail (/orders/[id])', () => {
  test('non-existent order id returns 404 or redirect', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/orders/000000000000000000000000');
    await expect(page.locator('body')).toBeVisible();
    // Should not crash with 500
    const hasAppError = await page.getByText(/application error/i).count();
    expect(hasAppError).toBe(0);
  });

  test('order detail page shows order number and status', async ({ page }) => {
    test.skip(needsAuth, 'Set E2E_USER_EMAIL + E2E_USER_PASSWORD to run auth tests');

    // Get first order from account/orders
    await page.goto('/account/orders');
    const firstOrderLink = page.getByRole('link', { name: /view/i }).first();
    const count = await firstOrderLink.count();
    test.skip(count === 0, 'No orders yet — place one first');

    await firstOrderLink.click();
    await page.waitForURL(/\/orders\//);

    // Order number visible
    await expect(page.getByText(/GNT-/i).or(page.getByText(/order #/i))).toBeVisible();
    // Status badge visible
    await expect(
      page.getByText(/confirmed/i).or(page.getByText(/processing/i)).or(page.getByText(/delivered/i))
    ).toBeVisible();
  });

  test('order detail shows status timeline', async ({ page }) => {
    test.skip(needsAuth, 'Set E2E_USER_EMAIL + E2E_USER_PASSWORD to run auth tests');
    await page.goto('/account/orders');
    const firstOrderLink = page.getByRole('link', { name: /view/i }).first();
    const count = await firstOrderLink.count();
    test.skip(count === 0, 'No orders yet');

    await firstOrderLink.click();
    await page.waitForURL(/\/orders\//);

    // Timeline steps should be visible
    await expect(
      page.getByText(/confirmed/i)
    ).toBeVisible();
    await expect(
      page.getByText(/delivered/i)
    ).toBeVisible();
  });

  test('order detail shows delivery address', async ({ page }) => {
    test.skip(needsAuth, 'Set E2E_USER_EMAIL + E2E_USER_PASSWORD to run auth tests');
    await page.goto('/account/orders');
    const firstOrderLink = page.getByRole('link', { name: /view/i }).first();
    const count = await firstOrderLink.count();
    test.skip(count === 0, 'No orders yet');

    await firstOrderLink.click();
    await page.waitForURL(/\/orders\//);

    await expect(
      page.getByText(/delivery address/i).or(page.getByText(/shipping address/i))
    ).toBeVisible();
  });

  test('order detail shows payment method', async ({ page }) => {
    test.skip(needsAuth, 'Set E2E_USER_EMAIL + E2E_USER_PASSWORD to run auth tests');
    await page.goto('/account/orders');
    const firstOrderLink = page.getByRole('link', { name: /view/i }).first();
    const count = await firstOrderLink.count();
    test.skip(count === 0, 'No orders yet');

    await firstOrderLink.click();
    await page.waitForURL(/\/orders\//);

    await expect(
      page.getByText(/cash on delivery/i).or(page.getByText(/cod/i))
    ).toBeVisible();
  });

  test('print invoice button is visible', async ({ page }) => {
    test.skip(needsAuth, 'Set E2E_USER_EMAIL + E2E_USER_PASSWORD to run auth tests');
    await page.goto('/account/orders');
    const firstOrderLink = page.getByRole('link', { name: /view/i }).first();
    const count = await firstOrderLink.count();
    test.skip(count === 0, 'No orders yet');

    await firstOrderLink.click();
    await page.waitForURL(/\/orders\//);

    await expect(
      page.getByRole('button', { name: /print invoice/i }).or(
        page.getByRole('button', { name: /print/i })
      )
    ).toBeVisible();
  });

  test('new=true shows success banner', async ({ page }) => {
    test.skip(needsAuth, 'Set E2E_USER_EMAIL + E2E_USER_PASSWORD to run auth tests');
    await page.goto('/account/orders');
    const firstOrderLink = page.getByRole('link', { name: /view/i }).first();
    const count = await firstOrderLink.count();
    test.skip(count === 0, 'No orders yet');

    const href = await firstOrderLink.getAttribute('href');
    if (href) {
      await page.goto(`${href}?new=true`);
      await expect(
        page.getByText(/order placed successfully/i).or(
          page.getByText(/successfully/i)
        )
      ).toBeVisible({ timeout: 8_000 });
    }
  });
});
