# Pharma Oasis B2B Wholesale Platform

## Overview

Pharma Oasis is a B2B wholesale web platform for pharmaceutical distribution in the UK. It enables registered pharmacies, online retailers, and wholesalers to browse a product catalogue, view wholesale pricing, create quote baskets, and submit quote requests. The platform also supports supplier registration and provides a comprehensive admin panel for managing customers, products, brands, categories, quotes, and site content. Built as a monorepo, it adheres to MHRA licensing and GDP compliance requirements with features like regulatory field validation, multi-step registration, and role-based access control.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Framework:** React 18 with TypeScript, Vite, Wouter for routing.
- **Styling:** TailwindCSS with custom design tokens, Shadcn UI components (Radix UI), three switchable themes, Inter and DM Sans fonts.
- **State Management:** React Query for server state, React Context API for authentication and quote basket (localStorage persisted).
- **Forms:** React Hook Form with Zod validation.
- **Patterns:** Separate public/admin layouts, protected routes, query invalidation, toast notifications, multi-step forms.

### Backend

- **Framework:** Express.js with TypeScript, session-based authentication (express-session with connect-pg-simple).
- **API:** RESTful JSON API (`/api` prefix), consistent error handling, Zod schema validation.
- **Authentication/Authorization:** Bcrypt password hashing, session cookies, four user roles (visitor, customer, supplier lead, admin), customer approval workflow.
- **Patterns:** Storage abstraction, Drizzle Zod for schema-first design, shared validation schemas, email notifications.

### Data Storage

- **ORM & Database:** Drizzle ORM with PostgreSQL.
- **Schema:** Tables for users, brands, categories, products, quotes, supplier leads, CMS blocks, site settings, contact messages, offers, and offer items.
- **Relationships:** Products linked to brands and categories; quotes linked to users and quote items; categories are self-referential.
- **Seed Data:** Includes admin user, 37 UK pharmaceutical brands, 78 realistic products with EANs, pricing, descriptions, and images, 25+ subcategories, CMS blocks, site settings, hero banners, and company locations.

### AI Agents

- **AI Category Agent:** Uses GPT-4o-mini to review and correct product categorizations, tracking changes and aliases.
- **SEO AI Agent:** Uses GPT-4o-mini to generate meta titles and descriptions for products, brands, and categories, running on a 24-hour schedule.
- **AI Blog Generator:** Uses GPT-4o-mini to generate compliance-safe blog articles with structured JSON output, topic classification, source selection, and automatic internal/external linking.
- **Retroactive Compliance Link Insertion:** Scans existing blog posts to insert compliance links.
- **Compliance Page:** Public page `/compliance` serving as a central reference for GDP/MHRA.

### Offers System

- **Offers Campaigns:** Admin can create promotional offer campaigns with title, slug, description, hero banners, display style (grid/featured/list), badge customization, start/end dates, and active toggle.
- **Offer Items:** Products linked to offers with special offer prices alongside original prices, discount labels, and sort ordering.
- **Public Offers Page:** `/offers` displays active campaigns with countdown timers, hero banners, and product grids. Registered customers can add offer products to quote basket.
- **Admin Offers Panel:** `/admin/offers` for CRUD management of campaigns and product assignments. Product search with inline pricing entry.
- **Display Styles:** Grid (default), Featured Spotlight (large hero product + grid), List View (horizontal cards).
- **Tables:** `offers` (campaigns), `offer_items` (products in offers). Tables auto-created at runtime via db.ts pool queries.

### Intelligent Product Sorting

- **Daily Rotation:** Page 1 of the product catalogue displays 50 daily randomized products, prioritizing direct distributor brands and products with images.
- **Popularity Tracking:** Tracks product views, quote adds, and conversions for future popularity-weighted sorting.

### Security & Compliance

- Bcrypt password hashing, environment-based configuration, MHRA/GPhC regulatory validation, Helmet middleware for security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy), response compression.

### Performance & SEO

- Static asset caching, `/health` endpoint, SEO-compliant `robots.txt` and `sitemap.xml`, `SITE_URL` for absolute URLs.

## External Dependencies

- **Database:** PostgreSQL (Neon via `NEON_DATABASE_URL` for production/shared development; falls back to Replit's `DATABASE_URL`).
- **Email:** SMTP service (Nodemailer) configured via `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, sending notifications to `NOTIFICATION_EMAIL`.
- **Session Storage:** PostgreSQL-backed via `connect-pg-simple`, using `SESSION_SECRET`.
- **Image Handling:** Replit Object Storage for persistent image storage (upload/serving endpoints, Sharp for processing, `DEFAULT_OBJECT_STORAGE_BUCKET_ID` required).
- **Development Tools:** Replit deployment platform, Replit-specific plugins.
- **AI Models:** GPT-4o-mini for all AI agent functionalities.