import { Page, expect } from '@playwright/test';

/**
 * Shared helpers for GNT e2e tests.
 * Tests run against a live dev server at http://localhost:3000
 * with real MongoDB (MONGODB_URI must be in .env.local).
 *
 * Clerk auth: tests that require sign-in use a pre-seeded test user
 * whose credentials are read from environment variables:
 *   E2E_USER_EMAIL    (default: test@example.com)
 *   E2E_USER_PASSWORD (default: TestPass123!)
 */

export const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
export const TEST_EMAIL = process.env.E2E_USER_EMAIL ?? 'test@example.com';
export const TEST_PASSWORD = process.env.E2E_USER_PASSWORD ?? 'TestPass123!';

/** Navigate to the Clerk-hosted sign-in and complete the flow. */
export async function signIn(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  await page.goto(`${BASE}/sign-in`);
  // Clerk renders its own iframe / hosted UI — wait for the email field
  const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
  await emailInput.waitFor({ timeout: 15_000 });
  await emailInput.fill(email);
  await page.keyboard.press('Enter');
  // Password step
  const pwInput = page.locator('input[type="password"]').first();
  await pwInput.waitFor({ timeout: 10_000 });
  await pwInput.fill(password);
  await page.keyboard.press('Enter');
  // Wait until we land somewhere other than /sign-in
  await page.waitForURL((url) => !url.pathname.startsWith('/sign-in'), { timeout: 15_000 });
}

/** Clear browser cookies + local storage (simulates a fresh guest session). */
export async function clearSession(page: Page) {
  await page.context().clearCookies();
  await page.evaluate(() => window.localStorage.clear());
}

/** Format a price as the app does: ₹N */
export function formatPrice(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

/** Wait for a toast / status message containing the given text. */
export async function waitForToast(page: Page, text: string) {
  await expect(page.getByText(text)).toBeVisible({ timeout: 8_000 });
}
