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

**CRITICAL: Database Configuration**
- **PRODUCTION USES NEON_DATABASE_URL** - All database updates, migrations, and seeding MUST target the Neon database
- The application connects to Neon via `NEON_DATABASE_URL` environment variable (set as a secret)
- `drizzle.config.ts` uses `DATABASE_URL` (Replit's local DB) - this does NOT affect production
- To update the production database schema or run seeds:
  - Use scripts that import from `server/db.ts` (which uses NEON_DATABASE_URL)
  - Run `npx tsx server/seed.ts` to seed the production Neon database
  - For direct SQL on Neon, create a script using the pool from `server/db.ts`
- The Replit `execute_sql_tool` connects to Replit's DATABASE_URL, NOT Neon - do not use it for production fixes

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
- Helmet middleware with production-grade security headers:
  - Content-Security-Policy (CSP) for XSS protection
  - HSTS with 1-year max-age and preload
  - X-Frame-Options: DENY (clickjacking protection)
  - Referrer-Policy: strict-origin-when-cross-origin
- Response compression via gzip/deflate middleware

**Performance & SEO:**
- Static asset caching:
  - Hashed build assets: 1 year, immutable
  - Public assets: 7 days with ETag
  - Attached assets (product images): 30 days, immutable
- Health check endpoint: GET /health (for uptime monitoring)
- SEO-compliant file locations:
  - /robots.txt at root (blocks /admin/ and /api/)
  - /sitemap.xml at root (dynamic with products, brands, categories)
  - SITE_URL: https://pharmaoasis.co.uk

**Deployment:**
- Replit hosting (recommended to keep for WebSockets and AI background agents)
- For production without cold starts: set deploymentTarget = "reserved-vm" in .replit
- US-based servers (GCP) with 80-150ms latency to UK/EU
- AI agents use in-memory scheduling (must restart after deployment)

### AI Agents

**AI Category Agent** (`server/ai-category-processor.ts`):
- Automatically reviews and corrects product categorizations
- Uses GPT-4o-mini for intelligent category matching
- Processes 10 products every 5 minutes (~120/hour)
- Tracks changes in `ai_category_reviews` table
- Records category aliases for variant matching in `category_aliases` table
- Admin control: `/admin/ai-categories`

**SEO AI Agent** (`server/seo-ai-agent.ts`):
- Automated SEO optimization for products, brands, and categories
- Generates meta titles and descriptions using GPT-4o-mini
- Runs on 24-hour schedule (configurable)
- Processes 15 items per batch with 1.5s delay between items
- Features:
  - Site-wide SEO analysis
  - B2B pharmaceutical keyword optimization
  - Slug uniqueness validation
  - Action logging with AI reasoning
  - Recommendation generation
- Database tables:
  - `seo_agent_status` - Agent state and scheduling
  - `seo_agent_actions` - Change history with AI reasoning
  - `seo_recommendations` - Improvement suggestions
- Admin control: `/admin/seo-agent`
- API endpoints:
  - GET `/api/admin/seo-agent/status` - Agent status and site analysis
  - POST `/api/admin/seo-agent/start` - Start daily schedule
  - POST `/api/admin/seo-agent/stop` - Stop schedule
  - POST `/api/admin/seo-agent/run-now` - Manual trigger
  - GET `/api/admin/seo-agent/actions` - Action history (paginated)

**AI Blog Generator** (`server/routes.ts` - POST `/api/admin/blog/generate-draft`):
- Generates professional, compliance-safe blog articles
- Uses GPT-4o-mini with structured JSON output
- Topic classification system (Step 1): Regulatory/Compliance, OTC Medicines, Vitamins & Supplements, Medical Devices, Product/Brand
- Topic-specific source selection rules (Step 2):
  - Regulatory/Compliance → GOV.UK, MHRA, EMA
  - OTC Medicines → NHS, GOV.UK, MHRA
  - Vitamins & Supplements → NHS, EFSA
  - Medical Devices → MHRA device guidance, GOV.UK
  - Product/Brand → Manufacturer official site only
- Automatic internal and external linking:
  - External links: target="_blank" rel="noopener noreferrer"
  - Internal links: /compliance, /products, /distribution-network, /how-to-order
  - Topic detection triggers REQUIRED compliance link for GDP/MHRA topics
- Configurable internal links via INTERNAL_LINKS constant
- COMPLIANCE_KEYWORDS array for smart topic detection
- Compliance disclaimer automatically appended
- Draft-only workflow (requires manual review before publishing)
- Admin control: `/admin/blog`

**Retroactive Compliance Link Insertion:**
- Endpoint: POST `/api/admin/blog/insert-compliance-links`
- Scans existing blog posts for compliance-related content
- Inserts compliance links naturally in paragraphs mentioning GDP/MHRA
- Skips posts that already have compliance links
- Fallback adds paragraph before disclaimer if no suitable insertion point
- Returns detailed results of processed posts

**Compliance Page:**
- Public page at `/compliance`
- Comprehensive GDP, MHRA WDA(H), quality systems overview
- Acts as single internal authority reference for compliance content
- SEO-optimized with meta tags

**Important Notes for AI Agents:**
- Both agents use in-memory scheduling (intervals cleared on server restart)
- Agents must be manually restarted after deployment
- Database lock prevents concurrent runs across multiple instances
- All AI calls use GPT-4o-mini for cost efficiency