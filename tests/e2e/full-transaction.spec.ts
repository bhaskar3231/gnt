import { test, expect } from '@playwright/test';

/**
 * Full end-to-end transaction flow:
 *   1. Browse products
 *   2. Open product detail
 *   3. Add to cart
 *   4. View cart + verify item
 *   5. Proceed to checkout
 *   6. Fill address form
 *   7. Place COD order
 *   8. Verify order confirmation page
 *   9. Verify order in My Orders
 *  10. Verify order appears in Admin Orders
 *
 * Requires:
 *   - At least one ACTIVE product with a variant in the DB
 *   - E2E_USER_EMAIL + E2E_USER_PASSWORD env vars set
 *   - The test user must have SUPER_ADMIN or ADMIN role for step 10
 */

const needsAuth = !process.env.E2E_USER_EMAIL;

// Test address data
const TEST_ADDRESS = {
  name: 'Playwright Tester',
  phone: '9876543210',
  address: '123 Test Street, Sector 1',
  city: 'New Delhi',
  state: 'Delhi',
  postalCode: '110001',
  country: 'India',
};

test.describe('Full Transaction Flow (E2E)', () => {
  test.skip(needsAuth, 'Set E2E_USER_EMAIL + E2E_USER_PASSWORD to run full e2e flow');

  test('complete order flow: browse → add to cart → checkout → confirmation', async ({ page }) => {
    // ── STEP 1: Navigate to products page ────────────────────────────────────
    await page.goto('/products');
    await expect(page.getByRole('heading', { name: /all products/i })).toBeVisible();

    // ── STEP 2: Pick first available product ─────────────────────────────────
    const firstCard = page.locator('a[href^="/product/"]').first();
    const productCount = await firstCard.count();
    if (productCount === 0) {
      test.skip(true, 'No products in DB. Add a product via /admin/products/new first.');
      return;
    }
    const productName = await firstCard.locator('h2, h3, [class*="name"], [class*="title"]').first().textContent();
    await firstCard.click();
    await page.waitForURL(/\/product\//);

    // ── STEP 3: Verify product detail page ───────────────────────────────────
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/₹/)).toBeVisible();
    await expect(page.getByRole('button', { name: /add to cart/i })).toBeVisible();

    // ── STEP 4: Add to cart ───────────────────────────────────────────────────
    await page.getByRole('button', { name: /add to cart/i }).click();
    await expect(
      page.getByText(/added to cart/i).or(page.getByText(/✓/))
    ).toBeVisible({ timeout: 8_000 });

    // ── STEP 5: Go to cart ────────────────────────────────────────────────────
    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: /cart/i })).toBeVisible();
    // Cart should not be empty
    await expect(page.getByText(/₹/)).toBeVisible();
    // Subtotal and total shown
    await expect(
      page.getByText(/subtotal/i).or(page.getByText(/total/i))
    ).toBeVisible();

    // ── STEP 6: Proceed to checkout ───────────────────────────────────────────
    // If not signed in, Clerk sign-in button will be shown; sign in first
    const signInBtn = page.getByRole('button', { name: /sign in/i }).or(
      page.getByText(/sign in to checkout/i)
    );
    if (await signInBtn.count() > 0) {
      // Click sign-in, complete Clerk flow
      await signInBtn.first().click();
      // Clerk modal or redirect — handle email field
      const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
      await emailInput.waitFor({ timeout: 15_000 });
      await emailInput.fill(process.env.E2E_USER_EMAIL!);
      await page.keyboard.press('Enter');
      const pwInput = page.locator('input[type="password"]').first();
      await pwInput.waitFor({ timeout: 10_000 });
      await pwInput.fill(process.env.E2E_USER_PASSWORD!);
      await page.keyboard.press('Enter');
      // Wait for auth to complete
      await page.waitForTimeout(3_000);
    }

    // Navigate to checkout
    const checkoutBtn = page.getByRole('link', { name: /proceed to checkout/i }).or(
      page.getByRole('button', { name: /proceed to checkout/i })
    );
    await expect(checkoutBtn).toBeVisible({ timeout: 8_000 });
    await checkoutBtn.click();
    await page.waitForURL(/\/checkout/, { timeout: 10_000 });

    // ── STEP 7: Fill delivery address ─────────────────────────────────────────
    await expect(
      page.getByRole('heading', { name: /checkout/i }).or(
        page.getByText(/delivery address/i)
      )
    ).toBeVisible({ timeout: 10_000 });

    // Fill form fields
    const fillField = async (selector: string, value: string) => {
      const field = page.locator(selector).first();
      if (await field.count() > 0) {
        await field.fill(value);
      }
    };

    await fillField('input[name="name"], input[placeholder*="name" i]', TEST_ADDRESS.name);
    await fillField('input[name="phone"], input[placeholder*="phone" i]', TEST_ADDRESS.phone);
    await fillField('textarea[name="address"], input[name="address"], textarea[placeholder*="address" i]', TEST_ADDRESS.address);
    await fillField('input[name="city"], input[placeholder*="city" i]', TEST_ADDRESS.city);
    await fillField('input[name="state"], input[placeholder*="state" i]', TEST_ADDRESS.state);
    await fillField('input[name="postalCode"], input[placeholder*="postal" i], input[placeholder*="pin" i]', TEST_ADDRESS.postalCode);

    // Country defaults to India — only fill if empty
    const countryField = page.locator('input[name="country"], input[placeholder*="country" i]').first();
    if (await countryField.count() > 0) {
      const currentVal = await countryField.inputValue();
      if (!currentVal) await countryField.fill(TEST_ADDRESS.country);
    }

    // ── STEP 8: Verify COD payment option ────────────────────────────────────
    await expect(
      page.getByText(/cash on delivery/i).or(page.getByText(/pay on delivery/i))
    ).toBeVisible();

    // ── STEP 9: Place the order ───────────────────────────────────────────────
    const placeOrderBtn = page.getByRole('button', { name: /place order/i });
    await expect(placeOrderBtn).toBeVisible();
    await placeOrderBtn.click();

    // ── STEP 10: Verify order confirmation ───────────────────────────────────
    await page.waitForURL(/\/orders\//, { timeout: 20_000 });
    const confirmationUrl = page.url();

    // Success banner (from ?new=true)
    await expect(
      page.getByText(/order placed/i).or(
        page.getByText(/successfully/i).or(page.getByText(/🎉/))
      )
    ).toBeVisible({ timeout: 10_000 });

    // Order number visible
    await expect(page.getByText(/GNT-/i)).toBeVisible();

    // Status timeline visible
    await expect(page.getByText(/confirmed/i)).toBeVisible();

    // COD shown
    await expect(
      page.getByText(/cash on delivery/i).or(page.getByText(/cod/i))
    ).toBeVisible();

    // Items table
    await expect(page.getByText(/₹/)).toBeVisible();

    // Print button
    await expect(
      page.getByRole('button', { name: /print/i })
    ).toBeVisible();

    // ── STEP 11: Verify in My Orders ─────────────────────────────────────────
    await page.goto('/account/orders');
    await expect(page.getByRole('heading', { name: /my orders/i })).toBeVisible({ timeout: 8_000 });
    // The new order should appear
    await expect(page.getByText(/GNT-/i)).toBeVisible();
    await expect(page.getByText(/confirmed/i)).toBeVisible();

    // ── STEP 12: Verify in Admin Orders ──────────────────────────────────────
    await page.goto('/admin/orders');
    // Admin must be accessible for this user
    const adminError = await page.getByText(/403/i).count();
    if (adminError > 0) {
      // User doesn't have admin role — skip admin check
      return;
    }
    await expect(page.getByRole('heading', { name: /orders/i })).toBeVisible({ timeout: 8_000 });
    // Order should appear in admin list
    await expect(page.getByText(/GNT-/i)).toBeVisible();
  });
});
