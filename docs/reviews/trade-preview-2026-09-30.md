# Trade experience review — 30 September 2026

Preview branch: `feature/pharma-oasis-concept-02` (draft PR #17).
Review host: https://pharmaoasis-website-review.onrender.com/

This revision adds a connected, quote-led trade design review. The preview reads the live public website catalogue through the existing GET-only allowlist proxy. It does not query Neon directly or write customer, product, price, quote, order or inventory data. No employee-app or QMS changes are included.

## Screens

- `/`: approved branded Pharma Oasis skincare artwork in the hero and a future-collection section. Interest form demonstrates validation and confirmation without retaining or sending personal details.
- `/products`: compact image cards, list view, EAN lookup, suggestions from three characters, grouped product/brand/category results, searchable and combinable taxonomy filters, pagination, product details, saved products and add-to-quote.
- `/portal`: sample account overview, locally saved draft, illustrative requests, saved-product count and weekly-edit access.
- `/portal/quote`: editable quantities in units/cases, remove lines, CSV download, destination, optional delivery date/reference/notes and a local-only preview request.
- `/portal/quotes` and `/portal/saved`: request history and favourites. Locally created preview requests can be repeated.
- `/oasisbiome`: on-site distributor/stockist interest form, also accessible from the homepage OasisBiome section. The preview validates and confirms locally; non-preview builds use the existing contact-enquiry endpoint. No mailto redirection.
- `/login`: sample-account entry and link to existing live customer sign-in. No real credentials are requested in the preview.
- `/__review/mobile?path=/products`: 390px responsive catalogue review. Also supports `/`, `/portal` and `/portal/quote`.

Preview routes require `VITE_REVIEW_PREVIEW=true`. The live authentication and quoting routes remain the non-preview defaults. Demo state uses a separate browser-local key and never uses the live basket. Server-side writes remain blocked.

## Source artwork

Approved image: “Pharmaoasis° skincare collection in warm sunlight.png”, retrieved from the user's saved files. Asset `/brand/pharmaoasis-skincare.webp` is a web-optimised copy without visual redesign.

## Follow-on integration

After design review, connect the approved customer identity and company account; reconcile eligible app-master products to the web using EAN; reuse the live quotation and order bridge; confirm how customer-specific RD pricing is presented; connect skincare interest submissions. The full inventory master has not been published as part of this preview. Illustrative quote records are labelled SAMPLE; local preview submissions use DEMO references.

## Validation

Production client/server build passed. Type checking reports existing server errors in PM sync and pricing modules; no client errors remain from this revision. Hosted browser verification covers catalogue search, filters, saving, quantity editing, local request confirmation and responsive views.
