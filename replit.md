# Pharma Oasis B2B Wholesale Platform

## Overview

Pharma Oasis is a B2B wholesale web platform designed for pharmaceutical distribution to UK pharmacies, online retailers, and wholesalers. The platform enables registered and approved customers to browse a comprehensive product catalogue, view wholesale pricing, assemble quote baskets, and submit quote requests. It includes supplier registration capabilities and a comprehensive admin panel for managing customers, products, brands, categories, quotes, and site content.

The application is built as a monorepo running entirely within Replit, serving both customer-facing public pages and an administrative backend. It supports MHRA-licensed pharmaceutical distribution with GDP compliance requirements, featuring regulatory field validation, multi-step registration workflows, and role-based access control.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling:**
- React 18 with TypeScript for type safety
- Vite as build tool and development server
- Wouter for lightweight client-side routing
- TailwindCSS for utility-first styling with custom design tokens

**UI Component System:**
- Shadcn UI component library (Radix UI primitives)
- Custom theme system using CSS custom properties with data-theme attribute
- Three switchable theme variants (Clinical Blue, Professional Green, Modern Slate)
- Typography system using Inter (primary) and DM Sans (accent) fonts
- Responsive design with mobile-first approach

**State Management:**
- React Query (@tanstack/react-query) for server state management and caching
- React Context API for authentication state
- React Context API for quote basket (shopping cart) state with localStorage persistence
- Form state managed by React Hook Form with Zod validation

**Key Frontend Patterns:**
- Public/Admin layout separation with dedicated layout components
- Protected routes using auth middleware and role checking
- Query invalidation on mutations for optimistic UI updates
- Toast notifications for user feedback
- Multi-step registration forms with validation

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript
- Session-based authentication using express-session
- PostgreSQL session store (connect-pg-simple)
- Role-based access control middleware (requireAuth, requireAdmin)

**API Design:**
- RESTful API endpoints under `/api` prefix
- JSON request/response format
- Consistent error handling with appropriate HTTP status codes
- Request validation using Zod schemas

**Authentication & Authorization:**
- Password hashing with bcrypt (10 rounds)
- Session cookies (7-day expiry, httpOnly, secure in production)
- Four user roles: visitor, customer (approved), supplier lead (no login), admin
- Customer account approval workflow (pending → active/rejected/suspended)

**Key Backend Patterns:**
- Storage abstraction layer for database operations
- Schema-first design with Drizzle Zod integration
- Centralized validation schemas shared between client and server
- Email notifications for registrations and quote submissions

### Data Storage Architecture

**ORM & Database:**
- Drizzle ORM with PostgreSQL
- Type-safe database queries with Drizzle query builder
- Schema migrations managed by drizzle-kit
- Database field index documented in DATABASE_FIELD_INDEX.md (enforced documentation-first approach)

**Schema Design:**
- `users` - Customer and admin accounts with comprehensive business/regulatory fields
- `brands` - Product brands with direct distributor flag
- `categories` - Self-referential hierarchy (parent_id for subcategories)
- `products` - Full product catalogue with SKU, EAN, pricing, MOQ, stock levels
- `quotes` & `quote_items` - Quote request system with status workflow
- `supplier_leads` - Supplier registration submissions (no login required)
- `cms_blocks` - Dynamic content management for static pages
- `site_settings` - Application configuration (theme, contact info, etc.)
- `contact_messages` - Contact form submissions

**Data Relationships:**
- Products → Brands (many-to-one)
- Products → Categories (many-to-one for category and subcategory)
- Quotes → Users (many-to-one)
- Quote Items → Quotes + Products (many-to-one relationships)
- Categories → Categories (self-referential for parent/child)

**Seed Data Strategy:**
- Admin user (admin@pharmaoasis.com / Admin!234)
- 37 real UK pharmaceutical and healthcare brands including:
  - OTC Medicines: Nurofen, Panadol, Calpol, Lemsip, Strepsils, Gaviscon, Rennie, Imodium, Benylin, Piriteze, Piriton
  - Vitamins & Supplements: Seven Seas, Vitabiotics, Centrum, Berocca, Floradix, Solgar
  - Skincare: E45, CeraVe, La Roche-Posay, Simple, Nivea
  - Oral Care: Sensodyne, Corsodyl, Colgate, Bonjela, Anbesol
  - First Aid: Elastoplast, Savlon, Dettol
  - Baby Care: Sudocrem, Bepanthen, Infacol, Dentinox
  - Medical Devices: Omron, Accu-Chek
- 78 realistic pharmaceutical products with:
  - EAN barcodes for each product
  - Realistic UK wholesale and RRP pricing
  - Product descriptions
  - Stock images assigned from /attached_assets/stock_images/
  - Proper categoryId and subcategoryId relationships
- 25+ subcategories including: Pain Relief, Cold & Flu, Cough & Sore Throat, Heartburn & Indigestion, Allergy Relief, Multivitamins, Omega 3 & Fish Oils, Iron Supplements, Energy & Immunity, Toothpaste, Mouthwash, Mouth Ulcers, Plasters, Antiseptics, Moisturisers, Dry Skin, Baby Pain Relief, Nappy Rash, Teething, Colic Relief
- CMS blocks for static page content
- Default site settings
- 9 hero slide banners for homepage carousel
- 4 company locations (UK HQ, UK Warehouse, Netherlands, India)

### External Dependencies

**Third-Party Services:**
- PostgreSQL database (Neon - external, shared between development and production)
  - Connection via NEON_DATABASE_URL environment variable
  - Both dev and prod connect to the same Neon database for content parity
  - Falls back to Replit's DATABASE_URL if NEON_DATABASE_URL not set
- SMTP email service (Nodemailer with environment configuration)
- Email notifications sent to NOTIFICATION_EMAIL for:
  - New customer registrations
  - New supplier registrations
  - Quote submissions
  - Contact form submissions

**Development Tools:**
- Replit deployment platform
- Replit-specific plugins for development (cartographer, dev banner, runtime error overlay)

**Email Configuration:**
Environment variables required for email functionality:
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port
- `SMTP_USER` - SMTP authentication username
- `SMTP_PASS` - SMTP authentication password
- `NOTIFICATION_EMAIL` - Admin recipient for notifications

**Session Storage:**
- PostgreSQL-backed session storage (connect-pg-simple)
- Session secret from `SESSION_SECRET` environment variable

**Image Handling (Replit Object Storage):**
- Images persist in Replit Object Storage (survives deployments)
- Upload endpoint: POST /api/admin/uploads (multipart form, admin-only)
- Serving endpoint: GET /objects/{category}/{uuid}.{ext}
- Image categories: brand (200x80 PNG), product (600x600 JPEG + thumbnail), hero (1920x720 WebP), general (800x600 JPEG)
- Processing via Sharp library with automatic resizing and optimization
- Required env var: DEFAULT_OBJECT_STORAGE_BUCKET_ID (auto-set by Replit Object Storage tool)
- Graceful degradation: Returns 503 if Object Storage not configured
- Database tracking via media_assets table (filename, URL, dimensions, category)

**CSV Import Capability:**
Admin panel includes product import from CSV with field mapping for:
- SKU, EAN, product name, brand, category, subcategory
- Pack size, price, MOQ, stock level
- Description and image URL

**Security & Compliance:**
- Bcrypt password hashing
- Environment-based configuration for sensitive data
- MHRA and GPhC regulatory field validation
- GDP compliance documentation requirements in registration forms