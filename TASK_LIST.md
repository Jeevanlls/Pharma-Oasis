# TASK LIST
## Complete Implementation Checklist for Pharma Oasis Wholesale Platform

**Instructions:**
- Work through tasks sequentially by section
- Tick checkbox when complete: `- [x]`
- Update this file after each completed task
- Always state which task you're working on before starting

---

## 1. SETUP & TOOLING

- [x] Project structure already exists (React + TypeScript + Vite)
- [x] Shadcn UI components already installed
- [x] TailwindCSS already configured
- [x] Design guidelines already created
- [ ] Create PostgreSQL database for data persistence
- [ ] Configure theme system with 3 switchable themes in CSS

---

## 2. DATABASE SCHEMA (Drizzle ORM)

- [ ] Define users table with all customer registration fields
- [ ] Define brands table with is_direct_distributor field
- [ ] Define categories table with self-referential parent_id
- [ ] Define products table with all CSV import fields
- [ ] Define quotes table
- [ ] Define quote_items table
- [ ] Define supplier_leads table
- [ ] Define cms_blocks table
- [ ] Define site_settings table
- [ ] Define contact_messages table
- [ ] Run database migrations
- [ ] Create seed script with admin user, sample data, CMS content

---

## 3. FRONTEND COMPONENTS (Phase 1)

### Layout & Navigation
- [ ] Create main layout with header, footer
- [ ] Create public navigation (Products, Brands, How to Order, Contact, Login/Register)
- [ ] Create customer navigation (with My Quotes)
- [ ] Create admin sidebar navigation
- [ ] Implement responsive mobile menu
- [ ] Implement theme switcher

### Homepage
- [ ] Hero section with headline, subheadline, bullets, CTAs, search
- [ ] Brands strip section
- [ ] Why Work With Us section (4 cards)
- [ ] For Pharmacies & Wholesalers section
- [ ] For Brands & Suppliers section
- [ ] How We Work section (3 steps)
- [ ] Compliance strip section

### Product Pages
- [ ] Product catalogue page with filters, search, pagination
- [ ] Product card component (visitor vs customer view)
- [ ] Product detail page

### Quote System
- [ ] Quote basket page
- [ ] Quote basket item component
- [ ] Quote submission confirmation

### Registration Forms
- [ ] Customer registration form (7 sections, 30+ fields)
- [ ] Supplier registration form
- [ ] Login page

### Static Pages
- [ ] How to Order page
- [ ] Brands & Distribution page
- [ ] Contact Us page with form

### Admin Panel
- [ ] Admin dashboard
- [ ] Customers management (list, approve/reject, edit)
- [ ] Suppliers management (list, view, update status)
- [ ] Products management (CRUD, list)
- [ ] Brands management (CRUD)
- [ ] Categories management (CRUD)
- [ ] Quotes management (list, view, update status)
- [ ] Site settings (theme dropdown, email settings)
- [ ] CMS content editor
- [ ] CSV import interface

---

## 4. BACKEND API (Phase 2)

### Authentication
- [ ] POST /api/auth/register (customer registration)
- [ ] POST /api/auth/login
- [ ] GET /api/auth/me
- [ ] POST /api/auth/logout
- [ ] Auth middleware (JWT)
- [ ] Role-based access control middleware

### Public Routes
- [ ] GET /api/products (filter, search, paginate)
- [ ] GET /api/products/:id
- [ ] GET /api/brands
- [ ] GET /api/categories
- [ ] GET /api/cms/:key
- [ ] GET /api/settings/:key
- [ ] POST /api/suppliers/register
- [ ] POST /api/contact

### Customer Routes
- [ ] GET /api/quotes (customer's quotes)
- [ ] POST /api/quotes (submit quote)
- [ ] GET /api/quotes/:id

### Admin Routes
- [ ] GET /api/admin/customers
- [ ] GET /api/admin/customers/:id
- [ ] PATCH /api/admin/customers/:id
- [ ] GET /api/admin/suppliers
- [ ] PATCH /api/admin/suppliers/:id
- [ ] GET/POST/PATCH/DELETE /api/admin/products
- [ ] GET/POST/PATCH/DELETE /api/admin/brands
- [ ] GET/POST/PATCH/DELETE /api/admin/categories
- [ ] GET /api/admin/quotes
- [ ] PATCH /api/admin/quotes/:id
- [ ] POST /api/admin/products/import (CSV)
- [ ] PATCH /api/admin/cms/:key
- [ ] PATCH /api/admin/settings/:key

---

## 5. INTEGRATION & POLISH (Phase 3)

- [ ] Connect all frontend components to backend APIs
- [ ] Implement loading states
- [ ] Implement error handling
- [ ] Test all user flows
- [ ] Final responsive design check
- [ ] Architect review

---

**END OF TASK_LIST.md**
