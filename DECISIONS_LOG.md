# DECISIONS LOG
## Technical Decisions & Deviations from Spec

**Purpose:** Record all non-trivial technical decisions and any deviations from the specification.

---

## [Initial] - ORM and Database Choice

**Decision:** Use Drizzle ORM with PostgreSQL instead of Prisma with SQLite
**Reason:** The existing Replit project template uses Drizzle ORM and PostgreSQL is available via Replit's built-in database tools. This provides better production scalability.
**Impact:** Schema definitions use Drizzle syntax instead of Prisma. All database operations use Drizzle query builder.
**Alternatives Considered:** Prisma + SQLite (original spec recommendation) - not used due to existing template setup

---

## [Initial] - Frontend Framework

**Decision:** Use existing React + TypeScript + Vite + Shadcn UI setup
**Reason:** The Replit template already has this configured with all necessary components
**Impact:** Leverage existing Shadcn components (Button, Card, Form, etc.) for consistent UI
**Alternatives Considered:** None - using existing setup is most efficient

---

## [Initial] - Routing

**Decision:** Use wouter for client-side routing
**Reason:** Already configured in the template, lightweight alternative to React Router
**Impact:** Routes defined using wouter's Switch and Route components
**Alternatives Considered:** React Router (heavier, not needed for this scope)

---

## [Initial] - State Management

**Decision:** Use React Query (@tanstack/react-query) for server state, React Context for auth
**Reason:** Already configured in template, excellent for data fetching and caching
**Impact:** All API calls use useQuery/useMutation hooks
**Alternatives Considered:** Redux (over-engineered for this scope)

---

## [Initial] - Theme System Implementation

**Decision:** Implement themes using CSS custom properties with data-theme attribute
**Reason:** Works well with TailwindCSS, allows runtime theme switching without rebuild
**Impact:** Three theme variants defined in index.css, theme stored in site_settings table
**Alternatives Considered:** Tailwind config variants (would require rebuild on theme change)

---

## [Initial] - Categories Structure

**Decision:** Single categories table with parent_id for parent/child relationships
**Reason:** Per specification clarification, simpler than separate subcategories table
**Impact:** Products reference both category_id and subcategory_id (both point to categories table)
**Alternatives Considered:** Separate subcategories table (rejected for simplicity)

---

## [Initial] - Image Storage

**Decision:** Store external URLs only, no file upload in v1
**Reason:** Per specification clarification, simplifies MVP
**Impact:** Admin enters URLs, frontend shows placeholder for missing images
**Alternatives Considered:** File upload with Replit object storage (deferred to v2)

---

## [Initial] - Email Notifications

**Decision:** Log emails to console in development, use environment variables for SMTP in production
**Reason:** Per specification clarification, allows development without SMTP setup
**Impact:** Email utility checks for SMTP config, falls back to console logging
**Alternatives Considered:** Third-party email service (rejected for simplicity)

---

## [Initial] - Quote Status Workflow

**Decision:** Five statuses: pending, quoted, accepted, declined, closed
**Reason:** Per specification clarification
**Impact:** Admin can transition quotes between these states
**Alternatives Considered:** Simpler 3-status workflow (rejected for lack of granularity)

---

## [Initial] - Admin Seed User

**Decision:** Create admin user: admin@pharmaoasis.com / Admin!234
**Reason:** Per specification clarification
**Impact:** Documented in README, must be changed in production
**Alternatives Considered:** Random password (rejected for ease of initial setup)

---

**END OF DECISIONS_LOG.md**
