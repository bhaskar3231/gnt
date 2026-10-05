# Gift & Treat - E-Commerce Platform

A premium, modern, minimalist e-commerce platform for gifting and traditional North Indian treats.

## Features

### Products & Catalog
- **Multiple Product Categories**: Gifts, Treats, Children's Items
- **Dynamic Product Variants**: Support for different sizes, weights, and options
- **Rich Product Information**: Ingredients, allergens, dietary attributes for treats
- **Age-based Discovery**: For children's educational products
- **SEO Optimized**: Structured data, meta tags, canonical URLs

### Shopping Experience
- **Intuitive Cart & Wishlist**: Add to cart, save for later
- **Advanced Search & Filtering**: By category, price, type, dietary preferences
- **Product Reviews**: Verified purchases, admin moderation
- **Gift Features**: Gift wrapping, gift messages, personalization
- **Responsive Design**: Mobile-first, optimized for all devices

### Checkout & Payments
- **Multi-step Checkout**: Address, delivery, payment
- **Flexible Shipping**: Flat rate, free shipping threshold, weight-based
- **Razorpay Integration**: Secure payment processing
- **Order Management**: Track orders, order history, refunds

### Admin Panel
- **Product Management**: Create, edit, organize products and variants
- **Homepage CMS**: Database-driven content, drag-to-reorder sections
- **Hero Slides**: Schedulable, responsive image management
- **Coupon & Offers**: Create promotions, set expiration, usage limits
- **Analytics Dashboard**: Real-time metrics, charts, date ranges
- **Inventory Management**: Track stock, low stock alerts
- **Review Management**: Approve/reject user reviews
- **Audit Logs**: Track all admin actions
- **RBAC**: Multiple admin roles and permissions

### Corporate & Bulk
- **Corporate Gifting**: Special bulk pricing and customization
- **Enquiry Management**: Track corporate inquiries, quotes, negotiations
- **Custom Packaging**: Corporate branding options

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe code
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **React Hook Form** - Form validation
- **Zod** - Schema validation

### Backend
- **Next.js API Routes** - Serverless backend
- **MongoDB** - NoSQL database
- **Mongoose** - ODM layer

### External Services
- **Clerk** - Authentication
- **Supabase** - File storage
- **Razorpay** - Payments
- **Resend** - Email

### Testing
- **Vitest** - Unit tests
- **React Testing Library** - Component tests
- **Playwright** - E2E tests

### DevOps
- **GitHub Actions** - CI/CD pipeline
- **Vercel** - Deployment

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- MongoDB Atlas account
- Clerk account
- Supabase account
- Razorpay account
- Resend account

### Setup Steps

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd gnt
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **MongoDB Setup**
   - Create a cluster on MongoDB Atlas
   - Get connection string
   - Add to `MONGODB_URI` in `.env.local`

5. **Clerk Setup**
   - Create Clerk application
   - Add keys to environment variables
   - Configure redirect URLs

6. **Supabase Setup**
   - Create Supabase project
   - Create storage bucket named `media`
   - Add keys to environment variables

7. **Razorpay Setup**
   - Get API keys from Razorpay dashboard
   - Add to environment variables
   - Set webhook secret

8. **Resend Setup**
   - Get API key from Resend
   - Add to environment variables

### Running Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in browser.

## Available Commands

```bash
# Development
npm run dev              # Start development server

# Production
npm run build           # Build for production
npm run start          # Start production server

# Code Quality
npm run lint           # Run ESLint
npm run typecheck      # TypeScript type checking
npm run validate       # Run all checks

# Testing
npm run test           # Run unit tests
npm run test:watch    # Watch mode for tests
npm run test:coverage # Generate coverage report
npm run test:e2e      # Run E2E tests

# Database
npm run seed           # Seed development data
```

## Project Structure

```
gnt/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── (storefront)/      # Customer pages
│   ├── admin/             # Admin panel
│   ├── auth/              # Auth pages
│   └── layout.tsx         # Root layout
├── lib/
│   ├── db.ts              # MongoDB connection
│   ├── services/          # Business logic
│   ├── utils/             # Utility functions
│   └── constants/         # App constants
├── models/                # Mongoose schemas
├── repositories/          # Data access layer
├── types/                 # TypeScript types
├── middleware.ts          # Clerk middleware
├── tests/                 # Test files
├── public/                # Static files
└── .env.example           # Environment template
```

## Database Models

- **User**: Customer and admin users
- **Product**: Product catalog with variants
- **Category**: Hierarchical categories
- **Collection**: Custom product collections
- **Order**: Order tracking
- **Cart**: Shopping cart
- **Wishlist**: Saved items
- **Review**: Product reviews
- **Coupon**: Discount codes
- **Offer**: Promotional offers
- **Inventory**: Stock management
- **Address**: Shipping addresses
- **HomepageSection**: CMS sections
- **HeroSlide**: Homepage hero slides
- **Media**: Uploaded files
- **CorporateEnquiry**: B2B inquiries
- **AuditLog**: Admin action logs
- **SiteSettings**: Global configuration
- **FeatureFlag**: Feature toggles

## Security

- Input validation with Zod
- Server-side authorization checks
- RBAC for admin panel
- Webhook signature verification
- Payment verification
- Secure password storage (Clerk)
- Environment variables for secrets
- CORS configuration
- Rate limiting ready

## Performance

- Server Components for static content
- Image optimization
- Database indexing
- Pagination for large datasets
- Caching strategies
- Responsive images
- Lazy loading

## Deployment

### Vercel Deployment

```bash
git push origin main
# Vercel automatically deploys
```

## License

Proprietary - All rights reserved

## Support

For issues and support, contact: support@giftandtreat.com