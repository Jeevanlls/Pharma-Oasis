# Pharma Oasis — approved Concept 02

Status: implementation branch for review; not approved for production launch.
Base: migrate/off-replit, d9b372af61c721a838fe6e44887762c5c8867220.

## What changed

- Approved lowercase pharmaoasis° identity, white/aubergine/citrus palette, locally served DM Sans and Manrope, editorial hero and upcoming Oasisbiome packaging concept.
- Short homepage, editorial offer area, trade search, buying-list entry point, company story, Oasisbiome stockist enquiry, social/contact links from existing site settings.
- Public layouts and customer portal use the new identity; the staff admin retains its existing theme.
- Header/footer keep routes into product catalogue, customer account, quotes, suppliers, distribution, blog, legal and compliance pages.
- Scheduled public offers drive the homepage feature and weekly edit. Expired/inactive offers are filtered and refreshed every minute. Without a current offer, the homepage uses an evergreen product/brand focus; it never substitutes sample prices or dates.
- Per-offer share links; query-string search/brand/category links open the appropriate catalogue filter.
- EAN buying lists match the signed-in customer's catalogue, preserve leading zeroes, combine duplicates and reject invalid/ambiguous/unmatched/out-of-stock lines before changing the basket. Up to 50 lines; no order is placed by importing.
- Updated browser/PWA icons and cache version, page titles, and baseline homepage metadata.

## Existing business logic

No server, database schema, pricing resolver, authentication policy, order submission, quotation handling, email or inventory bridge code is changed. Existing server-side approval and price resolution remain authoritative. Catalogue/pricing values come from existing APIs. No production credentials are included in this branch or the review host.

## Editing content

Use `/admin/offers` for current public offers, dates, imagery and product selections. Use `/admin/settings` for contact and social links. Existing customer pricing and customer promotions remain in their current admin screens.

The previous homepage carousel/statistics/feature/section controls and footer CMS content remain in the database for reference and rollback, but are not displayed in this new editorial layout. An admin homepage notice points staff to the active offer/settings controls. Hero/story copy is versioned in React for this release. Oasisbiome imagery remains explicitly labelled a packaging concept, with launch details unconfirmed.

## Isolated review host

Build: `VITE_REVIEW_PREVIEW=true node --import tsx script/build.ts`
Start: `node script/review-preview.mjs`

The review host serves the actual built React frontend and allowlisted anonymous GETs to public website content. It has no database URL, sessions, production API credentials, email configuration, inventory bridge or background jobs. All write methods and private API paths return 403. Login/registration render a review notice, not a credential form. Search works; no live order, quote, application, chat or contact submission is possible. `X-Robots-Tag` and robots.txt prevent indexing requests. The production server/start command is unchanged; do not point the production service at this review entry point.

Production build: `node --import tsx script/build.ts`, then existing `npm start`. Do not set VITE_REVIEW_PREVIEW in production.

## Validation

- Production client and server build succeeded.
- Existing full TypeScript baseline has 17 errors in PM sync/pricing server files. Comparison after implementation shows no new TypeScript diagnostics.
- Buying-list tests: leading zeroes, duplicate sums, quantity/format limits, exact matching, account price/quote-only values, all-or-nothing failure, ambiguous and out-of-stock products.
- Review-host test: writes/private routes blocked; anonymous public reads only; no forwarded browser cookies/auth headers; noindex response header.
- React DOM checks with fixture APIs pass for four public pages, exact EAN search, active/expired offer filtering, authenticated account prices, priced basket order submission, and unpriced basket quote-only submission. These are frontend checks with isolated fixtures, not live trading transactions.
- Deployed browser review: desktop homepage, public search (13 live results for the tested term), preview login guard, mobile homepage at 390px, expanded/collapsed mobile menu and company-page navigation. Mobile company page fits its viewport without horizontal overflow. Public catalogue records sometimes store EAN in SKU; homepage features support both.
- Full signed-in customer/order/quote end-to-end testing still needs an isolated website database before production launch. Browsing preview does not claim to test actual order processing.

## Launch gate

Review desktop/mobile presentation and CMS offer content. Then test login, assigned customer prices, priced order, unpriced quote, notes and inventory handoff against an isolated website database. Merge into migrate/off-replit only after launch approval: that branch auto-deploys the live website. The employee inventory app, its Neon data and QMS preview are separate and unchanged.
