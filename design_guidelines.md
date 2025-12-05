# Pharma Oasis B2B Wholesale Platform - Design Guidelines

## Design Approach

**Reference-Based Approach**: Drawing inspiration from modern B2B SaaS platforms like Stripe (clean, data-focused), Linear (typography hierarchy, crisp UI), and Shopify Partners (professional commerce aesthetic). This is a professional wholesale portal, not a consumer shop - prioritize clarity, trust, and efficiency over flashy marketing.

---

## Core Design Principles

1. **Professional Trust**: Clinical precision in layout, generous whitespace, clear information hierarchy
2. **Data Clarity**: Product information, pricing, and forms must be instantly scannable
3. **Purposeful Restraint**: Every element serves a function - no decorative clutter
4. **Responsive Precision**: Mobile-first forms, tablet-optimized catalogues, desktop-powered admin

---

## Typography System

**Font Families** (via Google Fonts CDN):
- **Primary**: Inter (headings, UI, body) - clean, professional, excellent at small sizes
- **Accent**: DM Sans (hero headlines, feature callouts) - slightly warmer, approachable

**Type Scale** (Tailwind classes):
- **Hero Headline**: `text-5xl lg:text-6xl font-bold` (DM Sans)
- **Section Titles**: `text-3xl lg:text-4xl font-bold` (Inter)
- **Card Titles**: `text-xl font-semibold` (Inter)
- **Body Large**: `text-lg` (Inter)
- **Body**: `text-base` (Inter)
- **Small/Meta**: `text-sm` (Inter)
- **Captions**: `text-xs` (Inter)

**Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

---

## Layout System

**Container Strategy**:
- **Full-width sections**: `w-full` with inner `max-w-7xl mx-auto px-6 lg:px-8`
- **Content sections**: `max-w-6xl mx-auto`
- **Form containers**: `max-w-3xl mx-auto`
- **Reading content**: `max-w-prose`

**Spacing Primitives** (consistent use of): `2, 4, 6, 8, 12, 16, 20, 24, 32`
- Component padding: `p-4, p-6, p-8`
- Section spacing: `py-12 md:py-16 lg:py-24`
- Card gaps: `gap-6 lg:gap-8`
- Form field spacing: `space-y-4 md:space-y-6`

**Grid System**:
- **Feature grids**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- **Product catalogue**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- **Two-column layouts**: `grid-cols-1 lg:grid-cols-2`

---

## Component Library

### Navigation
- **Desktop**: Horizontal nav with logo left, links center/right, "Login" and "Register as Customer" buttons right
- **Mobile**: Hamburger menu, full-screen overlay with large touch targets
- **Sticky header** on scroll with subtle shadow
- **Breadcrumbs** for product detail, static pages (not homepage)

### Buttons
- **Primary**: Rounded corners `rounded-lg`, padding `px-6 py-3`, font `font-semibold text-base`
- **Secondary**: Border style, same sizing
- **Text/Ghost**: Minimal padding, underline on hover
- **Icon buttons**: Square `w-10 h-10`, centered icon

### Cards
- **Product cards**: Image top, content below, border `border`, shadow on hover `hover:shadow-lg`, transition `transition-shadow`
- **Feature cards**: Icon/image top-left, title, description, minimal border
- **Quote/admin cards**: Dense information, table-like layout where appropriate

### Forms
- **Input fields**: `rounded-md border px-4 py-2.5`, focus ring (theme-dependent)
- **Labels**: `text-sm font-medium mb-1.5` above field
- **Field groups**: `space-y-1.5` (label + input + error)
- **Section dividers**: Headings with subtle bottom border, `pb-2 mb-6`
- **Multi-step forms**: Progress indicator top, sticky on mobile
- **Error states**: Red border, red text below field `text-sm text-red-600`

### Tables (Admin)
- **Zebra striping**: Alternate row backgrounds
- **Sticky headers**: On scroll for long tables
- **Action columns**: Icon buttons right-aligned
- **Responsive**: Stack to cards on mobile

### Badges/Pills
- **Status badges**: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`
- **Category tags**: `px-3 py-1 rounded-md text-sm`

---

## Page-Specific Design

### Homepage

**Hero Section** (80vh):
- Full-width background (subtle gradient or light texture, NOT full-bleed photo)
- Centered content: Headline, subheadline, 3 bullet points (icon + text)
- Two CTA buttons horizontal (primary + secondary)
- Search bar below CTAs: wide `max-w-2xl`, rounded, icon left, placeholder visible
- **No hero image** - clean, typography-focused trust-building

**Brands Strip**:
- Light background section
- Section title centered
- Logo grid: `grid-cols-3 md:grid-cols-5 lg:grid-cols-8`, grayscale logos, hover opacity effect
- Direct distributor brands: subtle badge overlay or bolder display

**Why Pharmacies Choose Us** (4 cards):
- 2x2 grid on desktop, single column mobile
- Icon top-left (Heroicons), title, short description
- Equal height cards, subtle hover lift

**For Pharmacies & Suppliers** (2 columns):
- Side-by-side on desktop, stacked mobile
- Image/icon left, content right OR full-width content with inline CTA

**How We Work** (3 steps):
- Horizontal timeline on desktop (numbered steps with connecting line)
- Vertical stack on mobile
- Step number in circle, title, brief description

**Compliance Strip**:
- Subtle background, centered content, trust badge icons if appropriate

### Product Catalogue

**Layout**:
- **Sidebar filters** (desktop): Sticky, `w-64`, category tree, brand checkboxes, search input
- **Mobile filters**: Slide-out drawer with "Filters" button
- **Product grid**: Main content area, 3-4 columns desktop, 1-2 mobile
- **Pagination**: Bottom, showing "X of Y products", page numbers + prev/next

**Product Card**:
- **Image**: Square aspect ratio, placeholder if missing (light gray with icon)
- **Brand name**: Small, muted
- **Product name**: 2 lines max, truncate with ellipsis
- **Pack size**: Meta text
- **Price**: Large, bold (customer only) OR "Login to view pricing" (visitor)
- **MOQ badge**: If applicable, subtle pill
- **Add to Quote button**: Full-width at bottom OR icon button top-right

### Product Detail Page

**Layout**: Two-column on desktop (image left 40%, content right 60%), stacked mobile
- **Image**: Large, zoom on hover
- **Breadcrumbs**: Top
- **Brand + Product name**: Clear hierarchy
- **SKU, EAN, Pack size**: Meta row
- **Price + MOQ**: Prominent display (customer only)
- **Description**: Tabbed or sectioned (short vs. long)
- **Add to Quote**: Sticky on mobile, quantity selector + button

### Quote Basket

**Layout**: Cart-style table on desktop, cards on mobile
- **Line items**: Product image thumbnail, name, SKU, quantity selector, unit price, line total, remove button
- **Summary panel** (sticky right on desktop): Subtotal, estimated total, notes textarea
- **Submit button**: Large, primary, bottom of summary
- **Empty state**: Centered icon + message + "Browse Products" CTA

### Customer Registration (30+ fields)

**Multi-section form** with clear visual breaks:
- **Progress indicator**: Top, showing sections (Business Info → Contact → Address → Licensing → Trading → Additional)
- **Section headers**: Large, with subtle background or border-bottom
- **Field groups**: Logical clusters (e.g., billing address fields together)
- **Conditional fields**: Delivery address appears if "different from billing" checked
- **Dropdowns**: Custom-styled, searchable where appropriate (business type, country)
- **Help text**: Below fields for GPhC number, MHRA info
- **Submit**: Full-width at bottom, "Complete Registration" with loading state

### Admin Panel

**Sidebar navigation** (left, `w-64`, dark background from theme):
- Logo top
- Nav items with icons (Heroicons)
- Active state highlight
- Collapsible on mobile (hamburger)

**Main content area**:
- **Header**: Page title left, action buttons right (+ Add Product, Import CSV, etc.)
- **Filters/search**: Horizontal bar below header
- **Data tables**: Full-width, responsive, sortable columns
- **Detail modals/slides**: Right slide-out drawer for view/edit forms
- **Dashboard**: Stat cards (4-up grid), recent activity list, charts if applicable

---

## Imagery Guidelines

**Product Images**:
- **Placeholder**: Light gray background `bg-gray-100`, centered icon (package or pill icon from Heroicons)
- **Loaded images**: Object-fit contain, maintain aspect ratio
- **Quality**: External URLs, admin enters URL, no upload in v1

**Icons**:
- **Library**: Heroicons (outline for UI, solid for emphasis)
- **Size**: `w-5 h-5` for inline, `w-6 h-6` for cards, `w-8 h-8` for features
- **Color**: Inherit from theme (primary for active states, muted for inactive)

**No hero images** on homepage - trust and professionalism conveyed through typography and clean layout, not stock photography.

---

## Interactions & States

**Hover states**:
- Cards: Subtle shadow lift `hover:shadow-lg transition-shadow`
- Buttons: Slight background darken (theme-specific hover colors)
- Links: Underline appear `hover:underline`

**Loading states**:
- Skeleton screens for product grids
- Spinner overlays for form submissions
- Progress bars for CSV imports

**Empty states**:
- Centered icon + message + CTA
- Examples: Empty quote basket, no search results, no products in category

**No animations** except functional transitions (shadow, opacity, height changes - all `transition-all duration-200`)

---

## Responsive Breakpoints

Follow Tailwind defaults:
- **Mobile**: `< 640px` (sm)
- **Tablet**: `640px - 1024px` (md, lg)
- **Desktop**: `≥ 1024px` (lg, xl, 2xl)

**Mobile priorities**:
- Stack all multi-column layouts
- Full-width CTAs
- Simplified navigation (hamburger)
- Larger touch targets (`min-h-12` for buttons)

---

## Accessibility

- Semantic HTML (`<nav>`, `<main>`, `<article>`)
- ARIA labels for icon-only buttons
- Focus visible states (ring on focus)
- Color contrast ratios meet WCAG AA
- Form labels always present (not placeholder-only)
- Skip to content link (screen readers)

---

This design system creates a professional, trustworthy B2B wholesale platform that prioritizes clarity and efficiency over visual flair - exactly what pharmacies and healthcare professionals expect.