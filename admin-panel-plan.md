# Admin Panel Plan — GNT (Gift & Treat)

## Top-Level Overview

Build a production-ready admin panel at `/admin` for the GNT Next.js e-commerce app.
The panel is protected by Clerk authentication + role check (ADMIN or SUPER_ADMIN only).
It uses the existing Tailwind + shadcn/ui design system and connects to the existing
MongoDB models and Clerk auth already in the project.

**Scope:** 9 sections — Dashboard, Products, Orders, Categories, Coupons, Reviews, Users, Site Settings.
**Not in scope:** Bulk import/export, multi-tenant.

## Confirmed Decisions

- **Dashboard revenue chart:** Yes — include a line/bar chart of daily revenue for the last 30 days (use `recharts`, already in project dependencies)
- **Product image upload:** Via Supabase Storage (already configured in `lib/services/storage.ts`) — upload returns a public URL stored on the product

---

## Architecture

```
app/
  admin/
    layout.tsx              ← Admin shell: sidebar, header, auth guard
    page.tsx                ← Redirects to /admin/dashboard
    dashboard/page.tsx
    products/
      page.tsx              ← List + search + filter
      new/page.tsx          ← Create product form
      [id]/page.tsx         ← Edit product form
    orders/
      page.tsx              ← List + filter by status
      [id]/page.tsx         ← Order detail + status update
    categories/
      page.tsx              ← Tree list + inline edit
    coupons/
      page.tsx              ← List
      new/page.tsx          ← Create coupon form
      [id]/page.tsx         ← Edit coupon
    reviews/
      page.tsx              ← List with approve/reject actions
    users/
      page.tsx              ← List users + role management
    settings/
      page.tsx              ← SiteSettings form

app/api/admin/
  dashboard/route.ts        ← Stats aggregation
  products/route.ts         ← GET list, POST create
  products/[id]/route.ts    ← GET, PUT, DELETE
  orders/route.ts           ← GET list
  orders/[id]/route.ts      ← GET detail, PUT status
  categories/route.ts       ← GET, POST, PUT, DELETE
  coupons/route.ts          ← GET, POST
  coupons/[id]/route.ts     ← GET, PUT, DELETE
  reviews/route.ts          ← GET list, PUT moderate
  users/route.ts            ← GET list, PUT role
  settings/route.ts         ← GET, PUT

lib/
  admin-auth.ts             ← Shared helper: verifyAdminAccess(request)
```

---

## Sub-Tasks

---

### Sub-Task 1 — Admin Auth Guard + Layout Shell

**Intent:**
Protect all `/admin` routes so only ADMIN/SUPER_ADMIN users can access them.
Provide the persistent sidebar + header shell that wraps every admin page.

**Expected Outcomes:**
- Visiting `/admin/*` while unauthenticated redirects to Clerk sign-in
- Visiting `/admin/*` as a CUSTOMER role shows a 403 page
- Authenticated ADMIN/SUPER_ADMIN users see a sidebar with nav links to all 8 sections
- A shared `verifyAdminAccess()` helper is available for all admin API routes

**Todo List:**
1. Create `lib/admin-auth.ts` — export `verifyAdminAccess(userId)` that queries the User model by clerkId, checks role is ADMIN or SUPER_ADMIN, returns the user or throws 403
2. Update `middleware.ts` — add `/admin(.*)` to protected routes so Clerk redirects unauthenticated users to sign-in
3. Create `app/admin/layout.tsx` — server component that calls `verifyAdminAccess`, renders sidebar nav + header shell wrapping `{children}`
4. Create `app/admin/page.tsx` — simple redirect to `/admin/dashboard`
5. Create `app/admin/_components/sidebar.tsx` — nav links: Dashboard, Products, Orders, Categories, Coupons, Reviews, Users, Settings
6. Create `app/admin/_components/header.tsx` — top bar with page title and logged-in user display

**Relevant Context:**
- `middleware.ts` uses `clerkMiddleware()` from `@clerk/nextjs/server`
- `models/User.ts` has `clerkId` field and `role` enum (CUSTOMER | ADMIN | SUPER_ADMIN)
- `lib/db.ts` — use `dbConnect()` before any model query
- Existing shadcn/ui components in `node_modules` — use `Button`, `Badge`, etc.

**Status:** [x] done

---

### Sub-Task 2 — Dashboard Page + Stats API

**Intent:**
Give admins an at-a-glance overview of the store: total orders, revenue, products,
pending reviews, low-stock items, recent orders.

**Expected Outcomes:**
- `/admin/dashboard` shows stat cards: Total Orders, Total Revenue, Total Products, Pending Reviews, Low Stock Items
- A line/bar chart shows daily revenue for the last 30 days (using `recharts`)
- A "Recent Orders" table shows the last 10 orders with status badges
- All data is fetched from `/api/admin/dashboard`

**Todo List:**
1. Create `app/api/admin/dashboard/route.ts` — GET handler that calls `verifyAdminAccess`, runs parallel aggregations: order count, revenue sum, product count, pending review count, low-stock inventory count, last 10 orders, daily revenue for last 30 days
2. Create `app/admin/dashboard/page.tsx` — server component that fetches from the dashboard API, renders stat cards, revenue chart, and recent orders table
3. Create `app/admin/_components/stat-card.tsx` — reusable card with icon, label, value
4. Create `app/admin/_components/revenue-chart.tsx` — client component wrapping recharts BarChart/LineChart with daily revenue data

**Relevant Context:**
- `models/Order.ts` — `totalAmount`, `status`, `createdAt`
- `models/Review.ts` — `status` field (PENDING/APPROVED/REJECTED)
- `models/Inventory.ts` — `available` and `lowStockThreshold` fields
- `models/Product.ts` — for total count

**Status:** [x] done

---

### Sub-Task 3 — Products CRUD

**Intent:**
Allow admins to list, create, edit, and delete products and their variants.

**Expected Outcomes:**
- `/admin/products` shows paginated, searchable product list with status toggle
- `/admin/products/new` has a form to create a product with at least one variant
- `/admin/products/[id]` has a pre-filled edit form
- Delete triggers a confirmation and removes the product

**Todo List:**
1. Create `app/api/admin/products/route.ts` — GET (paginated list with search), POST (create product + variant)
2. Create `app/api/admin/products/[id]/route.ts` — GET single, PUT update, DELETE
3. Create `app/admin/products/page.tsx` — data table with search input, pagination, edit/delete actions
4. Create `app/admin/products/new/page.tsx` — product form (name, slug, description, type, category, tags, isActive, isFeatured) + variant sub-form (SKU, price, stock, attributes)
5. Create `app/admin/products/[id]/page.tsx` — same form pre-populated from GET
6. Create `app/admin/_components/product-form.tsx` — shared form component used by new and edit pages

**Relevant Context:**
- `models/Product.ts` — fields: name, slug, description, type, categoryId, tags, isActive, isFeatured, isBestSeller, isNewArrival
- `models/ProductVariant.ts` — fields: productId, sku, price, salePrice, stock, attributes
- `models/Category.ts` — needed for category dropdown
- `repositories/ProductRepository.ts` — reuse existing query patterns

**Status:** [x] done

---

### Sub-Task 4 — Orders Management

**Intent:**
Allow admins to view all orders and update their status through the fulfillment lifecycle.

**Expected Outcomes:**
- `/admin/orders` shows all orders filterable by status, searchable by order number
- `/admin/orders/[id]` shows full order detail: items, customer, address, payment, timeline
- Admin can change order status via a dropdown (CONFIRMED → PROCESSING → PACKED → SHIPPED → DELIVERED etc.)
- Status change is saved and reflected immediately

**Todo List:**
1. Create `app/api/admin/orders/route.ts` — GET with status filter + search + pagination
2. Create `app/api/admin/orders/[id]/route.ts` — GET full detail, PUT to update status
3. Create `app/admin/orders/page.tsx` — orders table with status filter tabs and search
4. Create `app/admin/orders/[id]/page.tsx` — order detail view with status updater
5. Create `app/admin/_components/order-status-badge.tsx` — colored badge per OrderStatus enum
6. Create `app/admin/_components/status-updater.tsx` — client component dropdown to change status

**Relevant Context:**
- `models/Order.ts` — fields: orderNumber, customerId, items, totalAmount, status, paymentStatus, shippingAddress, createdAt
- `OrderStatus` enum in `types/index.ts`
- `lib/services/OrderService.ts` — reuse existing update patterns

**Status:** [x] done

---

### Sub-Task 5 — Categories Management

**Intent:**
Allow admins to manage the product category tree (create, rename, delete, set parent).

**Expected Outcomes:**
- `/admin/categories` shows all categories in a flat list with parent info
- Inline form to add a new category (name, slug, parentId optional, type)
- Edit and delete actions per row

**Todo List:**
1. Create `app/api/admin/categories/route.ts` — GET all, POST create
2. Create `app/api/admin/categories/[id]/route.ts` — PUT update, DELETE
3. Create `app/admin/categories/page.tsx` — table list + inline add form at top
4. Reuse existing `CategoryRepository` query methods where possible

**Relevant Context:**
- `models/Category.ts` — fields: name, slug, parentId, type, isActive, imageUrl
- `repositories/CategoryRepository.ts` — existing find methods to reuse

**Status:** [x] done

---

### Sub-Task 6 — Coupons Management

**Intent:**
Allow admins to create and manage discount coupons.

**Expected Outcomes:**
- `/admin/coupons` shows all coupons with code, type, value, usage stats, expiry
- `/admin/coupons/new` has a form to create a coupon
- `/admin/coupons/[id]` is an edit form
- Delete removes the coupon

**Todo List:**
1. Create `app/api/admin/coupons/route.ts` — GET list, POST create
2. Create `app/api/admin/coupons/[id]/route.ts` — GET, PUT, DELETE
3. Create `app/admin/coupons/page.tsx` — coupons table with create button
4. Create `app/admin/coupons/new/page.tsx` — coupon form
5. Create `app/admin/coupons/[id]/page.tsx` — edit form
6. Create `app/admin/_components/coupon-form.tsx` — shared form

**Relevant Context:**
- `models/Coupon.ts` — fields: code, type (PERCENTAGE/FIXED), value, minOrderAmount, maxUses, usedCount, expiresAt, isActive, applicableCategories, applicableProducts

**Status:** [x] done

---

### Sub-Task 7 — Reviews Moderation

**Intent:**
Allow admins to approve or reject customer product reviews.

**Expected Outcomes:**
- `/admin/reviews` shows all reviews filterable by status (PENDING / APPROVED / REJECTED)
- Each row shows product name, customer, rating, comment, current status
- Approve and Reject buttons update status immediately

**Todo List:**
1. Create `app/api/admin/reviews/route.ts` — GET with status filter, PUT to update status
2. Create `app/admin/reviews/page.tsx` — reviews table with filter tabs + action buttons
3. Status update uses optimistic UI (client component with server action)

**Relevant Context:**
- `models/Review.ts` — fields: productId, userId, rating, comment, status (PENDING/APPROVED/REJECTED), createdAt

**Status:** [x] done

---

### Sub-Task 8 — Users Management

**Intent:**
Allow SUPER_ADMIN to view all users and promote/demote their role.

**Expected Outcomes:**
- `/admin/users` lists all users with name, email, role, join date
- Role can be changed via a dropdown (CUSTOMER / ADMIN / SUPER_ADMIN)
- Role change is restricted to SUPER_ADMIN only (ADMIN sees read-only)

**Todo List:**
1. Create `app/api/admin/users/route.ts` — GET paginated user list, PUT update role (SUPER_ADMIN only)
2. Create `app/admin/users/page.tsx` — users table with role selector per row

**Relevant Context:**
- `models/User.ts` — fields: clerkId, email, firstName, lastName, role, createdAt
- `UserRole` enum in `types/index.ts`
- Role restriction: check `user.role === 'SUPER_ADMIN'` before allowing PUT

**Status:** [x] done

---

### Sub-Task 9 — Site Settings

**Intent:**
Allow admins to edit global store settings (logo, contact info, social links, announcement bar).

**Expected Outcomes:**
- `/admin/settings` shows a form pre-filled from the SiteSettings document
- Saving updates the single SiteSettings document in MongoDB
- Announcement bar toggle works immediately

**Todo List:**
1. Create `app/api/admin/settings/route.ts` — GET current settings, PUT update (upsert)
2. Create `app/admin/settings/page.tsx` — settings form with sections: Brand, Contact, Social Links, Announcement Bar

**Relevant Context:**
- `models/SiteSettings.ts` — fields: storeName, logo, email, phone, address, socialLinks, announcementBar (text, isActive, bgColor)

**Status:** [x] done

---

## Shared Conventions

- All admin API routes MUST call `verifyAdminAccess(userId)` as the first step
- All admin pages are **server components** by default; only interactive parts (dropdowns, forms with onChange) are `"use client"` components
- Use existing shadcn/ui primitives: `Button`, `Badge`, `Input`, `Select`, `Table`, `Dialog`, `Tabs`
- Forms use `react-hook-form` + `zod` validation (already in project dependencies)
- Pagination: default 20 items per page, query param `?page=1`
- Error responses follow the existing `ApiResponse<T>` type from `types/index.ts`
- Slug fields: auto-generate from name using a utility (kebab-case, lowercase)
