# Quote inventory intelligence — 30 September 2026

The staff Sales desk can match a quote line to the inventory app by exact EAN, review dated supplier offers, actual goods-in costs, stock and trading history, and select a cost/selling price without leaving the quotation.

## Data rules

- EANs remain strings, including leading zeroes. No name-based or approximate matches.
- A supplier offer, goods receipt and stock-batch cost remain distinct sources. Nothing selects the cheapest or oldest offer automatically.
- GBP costs may be applied. Other currencies remain visible but require an explicit manual conversion; zero/missing/invalid costs cannot be selected.
- Prices over 90 days old or without a date are labelled for reconfirmation. Supplier offer comments remain visible.
- Incoming counts remaining ordered units after receipts. Open-order demand excludes units already shipped. The displayed balance is recorded stock minus remaining open-order demand, not a promise of sellable stock.
- Expired batches, negative quantities and unresolved quarantine records raise warnings. No stock is allocated, reserved or changed.
- Invoice history excludes voided invoices. Customer history requires the stored inventory customer ID; company names are never used to guess a customer match.
- Existing app recommendations remain advisory and are withheld when their inputs mix currencies. Customer prepared selling prices use the website's existing pricing resolver.
- Markup on cost is labelled separately from gross margin on selling price.

## Integration and privacy

The website backend calls `GET /api/portal/product-intelligence` on the inventory service using its new dedicated read credential. Set `PORTAL_INTELLIGENCE_TOKEN` on the inventory service, and the matching `INVENTORY_INTELLIGENCE_TOKEN` plus `INVENTORY_INTELLIGENCE_URL` on the website service. These settings do not change the existing CRM or enquiry credentials.

The website endpoint is `GET /api/admin/quotes/:id/intelligence?ean=...`, protected by the existing admin session and rate limiting. Inventory requests have bounded concurrency and timeout. Failed lookups do not block manual quotation entry. No credential reaches the browser.

Selected cost sources are signed for their quote ID, EAN and amount, and expire for initial application after 24 hours. Saving prices records supplier, source reference/date, lookup date and staff/time in the additive nullable `quote_items.pricing_source` JSONB column. Existing saved snapshots survive later source-price changes and quote version creation.

Customer quote and order responses omit internal cost, margin, source snapshots and nested product cost fields. The staff quoting flow remains Apply → Save prices → Send. Incomplete quotations cannot be sent. Acceptance/order creation and email delivery retain their existing workflows.

## Validation

- Focused tests cover signed price provenance, EAN preservation, tampering, changed cost/quote, expiry, foreign currencies, absent prices, pricing arithmetic and customer response privacy.
- Existing quote identity, version copying, email formatting and workspace tests remain in the check set.
- `node --import tsx script/build.ts` builds the website. The repository-wide TypeScript check still reports 17 pre-existing errors in pricing/PM modules; there are no new errors from this change.
- `script/admin-workspace-rehearsal.mjs` includes explicitly fictional pricing/stock records, without database or mail credentials. All mutation requests remain blocked.

## Release and rollback

Deploy the inventory endpoint first, configure the dedicated credential, then deploy the website. Previous production baselines: inventory `12509fc6c3bcb4afbe2b1593329cc4cd9291fda9`, website `ed265d9120ea19272e665e91bda7ea1fc8c8477a`.

Rollback by reverting the corresponding merges. Keep the nullable snapshot column so recorded provenance is preserved. QMS is not part of this release.
