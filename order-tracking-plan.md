# Order Tracking Feature — Implementation Plan

## Top-Level Overview

Add a full-stack order tracking feature to the existing GNT Next.js (App Router) + Mongoose codebase. The feature consists of:

1. **Schema change** — Add a `statusHistory` array to the `Order` model so every admin status update is recorded as a timestamped event.
2. **API endpoint** — `GET /api/orders/[orderId]/tracking` that returns order status, shipment data, the real `statusHistory` events, items, and address.
3. **Frontend page** — `/orders/[orderId]/tracking` (App Router server component) that renders a visual stepper, event timeline, items, and shipment info.
4. **Navigation hooks** — "Track Order" buttons added to the order detail page and the order history page.
5. **E2E test** — Playwright spec covering the tracking page in the existing `tests/e2e/` suite.

The feature follows every established pattern in the codebase:
- Auth via `auth()` from `@clerk/nextjs/server` + MongoDB `User.findOne({ clerkId })` lookup
- `dbConnect()` at the top of every route handler
- `NextResponse.json({ success, data })` response shape (`ApiResponse<T>` from `@/types`)
- App Router server components for pages, with `redirect()` for unauth and `notFound()` for missing records
- Tailwind CSS, no new dependencies
- `max-w-4xl mx-auto px-4 py-10` page container matching `/orders/[id]/page.tsx`

---

## Architecture Diagram

```
Admin updates order status
       ↓
PUT /api/admin/orders/[id] pushes entry to Order.statusHistory
       ↓
User navigates to /orders/[orderId]/tracking
       ↓
Page (server component) — auth() + dbConnect()
       ↓
Query Order by ID, verify customerId === user._id
       ↓
Return statusHistory as trackingEvents
       ↓
Render: StatusStepper + EventTimeline + ShipmentInfo + ItemsSummary
       ↓
"Track Order" links in OrderHistory + OrderDetail pages
```

---

## Sub-Tasks

---

### Sub-Task 0 — Schema: Add `statusHistory` to Order Model

**Status:** [ ] pending

**Intent:**
Extend the `Order` Mongoose schema with a `statusHistory` sub-document array. Each entry records the new status, a timestamp, and an optional note (e.g. "Tracking number added"). This is the data source for the real tracking events timeline.

The admin order update route (`PUT /api/admin/orders/[id]`) must also be updated to push a new entry onto `statusHistory` whenever the order status is changed. This means every admin action automatically populates the timeline — no separate manual step required.

**Expected Outcomes:**
- `Order` model has `statusHistory: { status, timestamp, note? }[]`
- `IOrder` interface includes `statusHistory`
- The admin order update route pushes to `statusHistory` on every status change
- Existing orders without `statusHistory` are handled gracefully (empty array default)

**Status History Entry Shape:**
```typescript
{
  status: string;       // one of the ORDER_STATUSES enum values
  timestamp: Date;      // when the transition occurred
  note?: string;        // optional free-text (e.g. tracking number, carrier)
}
```

**Todo List:**
1. Edit `models/Order.ts`:
   - Add `statusHistoryEntry` sub-schema: `{ status: String, timestamp: Date (default: Date.now), note: String (optional) }`
   - Add `statusHistory: [statusHistoryEntrySchema]` field to `orderSchema` with `default: []`
   - Add `statusHistory?: { status: string; timestamp: Date; note?: string }[]` to `IOrder` interface
2. Edit `app/api/admin/orders/[id]/route.ts` (the PUT handler):
   - After updating the order status, push `{ status: newStatus, timestamp: new Date() }` to `order.statusHistory`
   - Use `Order.findByIdAndUpdate` with `$push: { statusHistory: { status: newStatus, timestamp: new Date() } }` in the update object, or fetch + push + save if already using that pattern
   - Read the existing PUT handler first to choose the minimal-change approach

**Relevant Context:**
- `gnt/models/Order.ts` — add to existing schema
- `gnt/app/api/admin/orders/[id]/route.ts` — PUT handler that calls `OrderService.updateOrderStatus`
- `gnt/lib/services/OrderService.ts` — `updateOrderStatus` method; consider pushing there instead so all callers benefit
- The COD order confirm in `app/api/orders/route.ts` also calls `order.updateOne({ status: 'CONFIRMED' })` — that should also push an initial `statusHistory` entry

---

### Sub-Task 1 — API Endpoint: `GET /api/orders/[orderId]/tracking`

**Status:** [ ] pending

**Intent:**
Create the data source for the tracking page. The endpoint authenticates the request, looks up the order, verifies ownership, derives a `trackingEvents` array from the order's existing fields (status changes are not stored as a log on the model — derive from what is available: `createdAt`, `shipment.shippedAt`, and status), and returns a well-typed JSON response.

The endpoint uses `order.statusHistory` (added in Sub-Task 0) as the source of truth for `trackingEvents`. An initial "Order placed" event is always synthesised from `order.createdAt` if `statusHistory` is empty or does not contain a PENDING_PAYMENT entry, ensuring the timeline is never blank.

**Expected Outcomes:**
- `GET /api/orders/[orderId]/tracking` with valid auth + owned order → 200 with tracking payload
- Invalid orderId or wrong owner → 404
- Unauthenticated → 401
- Server error → 500 with message

**Response Shape:**
```typescript
{
  orderId: string;
  orderNumber: string;
  status: string;               // e.g. "CONFIRMED"
  trackingNumber: string | null;
  carrier: string | null;
  estimatedDelivery: string | null;  // ISO date string
  shippedAt: string | null;
  trackingEvents: {
    timestamp: string;          // ISO date string
    description: string;
    location: string | null;
  }[];                          // sorted newest-first
  shippingAddress: {
    name: string; phone: string; address: string;
    city: string; state: string; postalCode: string; country: string;
  };
  items: {
    productName: string;
    quantity: number;
    price: number;
    priceSnapshot: Record<string, unknown>;
  }[];
}
```

**Todo List:**
1. Create file `app/api/orders/[orderId]/tracking/route.ts`
2. Import `auth` from `@clerk/nextjs/server`, `dbConnect`, `User`, `Order`, `NextRequest`, `NextResponse`, `ApiResponse`
3. Export `async function GET(request, { params })` — await `params` (Next.js 15 App Router async params)
4. Auth guard: `auth()` → if no `userId` return 401
5. `await dbConnect()`
6. Look up `User.findOne({ clerkId: userId })` — return 404 if missing
7. Find order: `Order.findById(orderId)` (no `.lean()`) — return 404 if missing
8. Ownership check: `order.customerId.toString() !== user._id.toString()` → return 404 (not 403, to avoid info leak)
9. Build `trackingEvents` from `order.statusHistory`:
   - Map each `statusHistory` entry to `{ timestamp: entry.timestamp.toISOString(), description: STATUS_LABELS[entry.status] ?? entry.status, location: entry.note ?? null }`
   - Prepend a synthetic "Order placed" event from `order.createdAt` if `statusHistory` is empty or has no PENDING_PAYMENT entry
   - Sort descending by timestamp
10. Build and return the response object matching the shape above
11. Wrap in try/catch, return 500 on error

**Relevant Context:**
- Pattern to follow exactly: `gnt/app/api/orders/[id]/route.ts`
- Order model fields: `gnt/models/Order.ts` (shipment sub-doc has `carrierName`, `trackingNumber`, `shippedAt`; `statusHistory` added in Sub-Task 0)
- `ApiResponse<T>` type: `gnt/types/index.ts`
- Note: Next.js 15 App Router route handlers receive `params` as a `Promise` — must `await params` before accessing `orderId`

---

### Sub-Task 2 — Frontend Page: `/orders/[orderId]/tracking`

**Status:** [ ] pending

**Intent:**
Create an App Router server component page at `app/orders/[orderId]/tracking/page.tsx` that fetches data directly from the database (same pattern as `app/orders/[id]/page.tsx`) and renders the tracking UI. Using a server component avoids a client-side fetch + loading state.

The page renders four sections:
1. **StatusStepper** — horizontal pipeline from CONFIRMED → PROCESSING → PACKED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED, with current step highlighted
2. **Shipment Info** — tracking number, carrier, estimated delivery (or "Not yet available" fallback)
3. **Tracking Events** — scrollable chronological list
4. **Items Summary** — ordered products list

**Expected Outcomes:**
- Visiting `/orders/[orderId]/tracking` while authenticated and owning the order renders the full tracking UI
- Visiting unauthenticated redirects to `/sign-in`
- Non-existent or unowned order calls `notFound()`
- The current status step is visually differentiated (filled circle, bold label) from past/future steps

**Status Stepper Logic:**
Use the same `STATUS_SEQUENCE` the order detail page uses:
```
["CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"]
```
- Steps before and including current status → "completed" style (filled, colored)
- Current step → "active" style (ring/highlight)
- Steps after → "pending" style (gray, empty circle)
- Cancelled/returned orders → show a "Cancelled" banner instead of the stepper

**Todo List:**
1. Create `app/orders/[orderId]/tracking/page.tsx` as an `async` server component
2. Import `auth` from `@clerk/nextjs/server`, `redirect`, `notFound`, `dbConnect`, `User`, `Order`, `Link`
3. Auth guard: if `!userId` → `redirect('/sign-in')`
4. `await dbConnect()`
5. Look up user, find order by `orderId`, check ownership — `notFound()` on any failure
6. Define `STATUS_SEQUENCE`, `STATUS_LABELS`, stepper step state logic (completed / active / pending)
7. Map `order.statusHistory` to display events (same logic as the API route); prepend synthetic "Order placed" event if empty
8. Render layout with `max-w-4xl mx-auto px-4 py-10`
9. Render status stepper section:
   - Desktop: horizontal flex row with connecting lines
   - Each step: circle icon (filled ✓ if completed, ring if active, empty if pending) + label below
   - Cancelled/returned: replace stepper with a red cancellation banner
10. Render shipment info card (tracking number, carrier, shippedAt — with "Not yet available" fallbacks)
11. Render tracking events list (empty state: "No tracking events yet")
12. Render items summary (productName, qty, price per item)
13. Add "← Back to Order" link pointing to `/orders/[orderId]`
14. No `'use client'` — pure server component

**Relevant Context:**
- Follow pattern from `gnt/app/orders/[id]/page.tsx` — same auth guard, DB query, notFound pattern
- STATUS_SEQUENCE: `["CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"]`
- `statusHistory` is added by Sub-Task 0; page just reads it from the Order document
- All styling uses Tailwind only — no new dependencies
- `gnt/app/orders/[id]/_print-button.tsx` is a client component for reference on how to split client logic

---

### Sub-Task 3 — Navigation: Add "Track Order" Links

**Status:** [ ] pending

**Intent:**
Surface the tracking page from both existing order entry points so users can discover it without knowing the URL. Minimal changes — add one link per order in two places.

**Expected Outcomes:**
- Order History page (`/account/orders`): each order row/card has a "Track" link alongside "View"
- Order Detail page (`/orders/[id]`): a "Track Order" button/link appears near the top (action area), next to Print Invoice

**Todo List:**
1. Edit `app/account/orders/page.tsx`:
   - In the desktop table row, add a "Track" link cell after the "View Order →" cell, routing to `/orders/${order._id}/tracking`
   - In the mobile card, add a "Track" link alongside the "View →" link
   - Style consistently: same text-sm font-medium text-gray-600 underline style as "View" links
2. Edit `app/orders/[id]/page.tsx`:
   - In the action row near "Print Invoice", add a `Link` to `/orders/${params.id}/tracking` styled as a secondary button
   - Label: "Track Order"

**Relevant Context:**
- `gnt/app/account/orders/page.tsx` — desktop table at line ~100, mobile cards at line ~140
- `gnt/app/orders/[id]/page.tsx` — PrintButton is rendered near the top; add Track Order link adjacent

---

### Sub-Task 4 — E2E Test: `tests/e2e/tracking.spec.ts`

**Status:** [ ] pending

**Intent:**
Add a Playwright spec that validates the tracking page renders correctly. Follow the exact patterns from `tests/e2e/orders.spec.ts` — use `signIn()` from helpers, skip gracefully when no auth env vars or no orders are present, test via the live dev server.

**Expected Outcomes:**
- Test file exists at `tests/e2e/tracking.spec.ts`
- When run with Chromium and valid `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` + an existing order, the test:
  1. Signs in
  2. Navigates to `/account/orders`
  3. Finds a "Track" link and follows it to `/orders/[id]/tracking`
  4. Asserts the status stepper is visible (e.g., text "Confirmed" is present)
  5. Asserts the items section is visible
- When `E2E_USER_EMAIL` is not set → test skips with a clear message
- When no orders exist → test skips with a clear message

**Todo List:**
1. Create `tests/e2e/tracking.spec.ts`
2. Import `test`, `expect` from `@playwright/test`; import `signIn`, `BASE` from `./helpers`
3. Define `needsAuth = !process.env.E2E_USER_EMAIL`
4. Write test: "tracking page renders status stepper for authenticated user with an order"
   - `test.skip(needsAuth, ...)` at the top
   - `signIn(page)`
   - Navigate to `/account/orders`
   - Find the first "Track" link; skip if count === 0 (`'No orders yet'`)
   - Click it; `waitForURL(/\/tracking$/)`
   - Assert `page.getByText(/confirmed/i)` is visible (stepper label)
   - Assert `page.getByText(/order items/i).or(page.getByText(/items/i))` is visible
5. Write a second simpler test: "tracking page redirects unauthenticated users"
   - `clearSession(page)`
   - Navigate to a plausible tracking URL (use a fake ID: `/orders/000000000000000000000000/tracking`)
   - Assert no application crash (body is visible, no "application error" text)

**Relevant Context:**
- `gnt/tests/e2e/helpers.ts` — `signIn`, `clearSession`, `BASE`
- `gnt/tests/e2e/orders.spec.ts` — exact patterns for skip logic, navigation, assertions
- Playwright config baseURL: `http://localhost:3000`

---

### Sub-Task 5 — TypeScript Validation and Final Commit

**Status:** [ ] pending

**Intent:**
Verify zero new TypeScript errors are introduced by the new files, confirm the build passes, commit everything, push to GitHub, and deploy to Vercel.

**Expected Outcomes:**
- `tsc --noEmit` produces no errors in any of the 4 newly created/modified files
- `next build` succeeds
- `git push origin master` succeeds
- Vercel production deployment succeeds and is aliased to `https://gnt-self.vercel.app`

**Todo List:**
1. Run `npx tsc --noEmit 2>&1 | Select-String "tracking|account/orders|orders/\[id\]|models/Order"` to check only relevant files
2. Fix any type errors in the new files
3. Run `npx next build` to confirm clean build
4. `git add` all new and modified files
5. `git commit -m "feat(tracking): add order tracking page, API endpoint, nav links, and E2E test"`
6. `git push origin master`
7. `npx vercel --prod --yes` and confirm deployment status is Ready and aliased to `https://gnt-self.vercel.app`

**Relevant Context:**
- TypeScript strict mode is ON — all new code must be fully typed
- `next.config.ts` has `typescript.ignoreBuildErrors: true` so build won't fail on pre-existing errors, but tsc will still catch new ones
- PowerShell requires `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` before npm/npx commands
