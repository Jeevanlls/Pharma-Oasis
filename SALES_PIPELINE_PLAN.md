# Sales Pipeline (Quotes + Orders) — Plan & Handoff

_Created 2026-06-25. Written so a future session (or the owner) can resume without losing context. Companion to `AUTH_HANDOFF.md` and `PRICE_BUILDER_HANDOFF.md`._

## Goal (owner's words)
Rework the **Quotes** and **Orders** sections for a high-volume operation (**50–100+ quotes/orders per week**). Needs: a **proper dashboard**, a **user-friendly long-term design**, and a clean way to mark a deal **"taken into our inventory system"** so the active list stays uncluttered. This app is **NOT** the inventory system of record — the real stock/fulfilment lives in an external system; this app captures the deal and hands it off.

## Decisions (locked 2026-06-25)
1. **Inventory handoff:** manual entry **or Excel/CSV upload** into the external system for now; a deeper **API integration is a later phase**. So Phase A gives a clean printable/copy view + **CSV export** + a **"Mark entered into inventory"** action. No live stock deduction in this app.
2. **Merge approach:** **one unified "Sales" pipeline on screen, but quotes and orders stay as linked records underneath** (NOT one merged table). A quote and an order are the same deal at different stages; merging the data would lose quote-only concepts (expiry, versions) and order-only concepts (fulfilment).
3. **Start with Phase A** (worklist + handoff) — the biggest day-to-day win.

## The unified lifecycle
```
 Customer submits
    │
    ├─ "Request a quote" ─► NEW QUOTE ─► PRICED/SENT ─► customer ACCEPTS ─┐
    │                                         └─ customer DECLINES ─► Closed │
    │                                                                        ▼
    └─ "Place an order" ───────────────────────────────────────────► TO FULFIL
                                                                           │
                                            ① admin keys it into inventory system
                                               (manual or CSV export)
                                                                           │
                                                                           ▼
                                                        ENTERED ✓ ─► archived off
                                                                     the active worklist
```
The **active worklist** only ever shows deals that still need action. Anything **Entered**, **Cancelled**, **Declined/Closed** drops into an **Archive** tab.

## Current state (audited 2026-06-25) — why this is needed
- **Quotes** (`quotes`, `quote_items`): decent. Status machine enforced (`pending→quoted→accepted/declined→closed`), versioning (`version`, `parentQuoteId`), price/cost/margin snapshots on items. Admin page has search + bulk "mark as quoted" + version history.
- **Orders** (`orders`, `order_items`): the weak half. Status (`submitted|confirmed|processing|completed|cancelled`) is **NOT enforced** (admin can set anything). **No search, no filters, no bulk actions.** No relations defined. Items snapshot price/cost/margin.
- **Disconnected:** accepting a quote does **nothing** automatic — there is **no `quoteId` link on orders**, so the customer must re-enter items to actually order. Audit trail from quote→order is lost.
- **Dashboard:** shows quote counts + a "pending quotes" alert, but **nothing about orders** at all.
- **Customer confusion:** two quote screens — `/my-quotes` (public, has accept/decline + reorder) and `/portal/quotes` (portal, read-only). The portal basket has two buttons: **"Place Order"** vs **"Request Quote / Availability"** (so the customer chooses upfront).
- **Inventory:** products only carry `available_qty` (supplier "stock / on request" snapshot) + `stock_locations` text. No allocation/deduction. External system is the source of truth.

Key files:
- Schema: `shared/schema.ts` — quotes `164–194`, orders `1368–1413`.
- Backend: `server/routes.ts` — quotes `~934–2527`, orders `~4643–4812`; order storage in `server/pricing-store.ts` `341–433`; quote storage in `server/storage.ts` `736–850`.
- Frontend: `client/src/pages/admin/quotes.tsx`, `client/src/pages/admin/orders.tsx`, `client/src/pages/admin/index.tsx` (dashboard); customer `client/src/pages/quote.tsx`, `my-quotes.tsx`, `quote-detail.tsx`, `client/src/pages/portal/{orders,quotes,basket}.tsx`.

---

## PHASE A — high-volume worklist + clean handoff ✅ DONE (2026-06-25)

**Built, type-checked, built clean, and verified by a 15-assertion end-to-end test** (order status rules incl. invalid-transition rejection; CSV export; mark-entered → archives off the active worklist; bulk enter; stats; admin-auth required). New unified **Sales** page at `/admin/sales` (sidebar "Sales (pipeline)"), dashboard now shows an "Orders to handle" alert + Sales quick-action. The existing `/admin/quotes` and `/admin/orders` pages are kept (detailed modals/actions live there; the Sales page links to them via "Open"). Files: `client/src/pages/admin/sales.tsx`, `server/trusted-devices.ts` n/a, `server/pricing-store.ts` (order methods), `server/routes.ts` (order endpoints), `server/db.ts` + `shared/schema.ts` (columns).

_Original Phase A spec below (kept for reference):_

### Data model changes (orders)
Added idempotently in `server/db.ts` startup SQL (the project's migration pattern — `db:push` does NOT hit the live Neon DB) + typed in `shared/schema.ts`:
- `quote_id INTEGER` — link to the originating quote (used fully in Phase B; added now so the link exists).
- `entered_to_inventory_at TIMESTAMP` — when an admin marked it keyed into the external system.
- `entered_by INTEGER` — which admin did it.
- `archived_at TIMESTAMP` — when it left the active worklist.
- Enforce order **status transitions**: `submitted → confirmed → entered → cancelled` (entered & cancelled are terminal/archived). "processing/completed" kept as accepted legacy values but the primary flow is the above.

### Backend
- Enforce order status transitions in the respond/update path.
- `POST /api/admin/orders/:id/enter` — mark **entered into inventory**: sets status=`entered`, `entered_to_inventory_at`, `entered_by`, `archived_at` → archives it.
- `POST /api/admin/orders/bulk` — bulk status change / bulk mark-entered.
- `GET /api/admin/orders?archived=false|true` — split active vs archived.
- `GET /api/admin/orders/:id/export` — CSV of the order's lines (for manual/Excel handoff). Plus a bulk CSV.
- Extend the admin **stats** endpoint with order KPIs (new / to-fulfil / done this week).

### Frontend
- New unified **Sales** worklist page: KPI tiles ("Needs pricing", "Awaiting customer", "To fulfil", "Done this week") + a **searchable / filterable / sortable table** (customer, date, value, stage, **Type = Quote|Order**) with **bulk select**. Merges admin quotes + orders into one list (client-side merge; backend stays two endpoints).
- **"Mark entered into inventory"** action (single + bulk) and **CSV export** (single + all/filtered).
- **Active / Archived** tabs.
- Add order stats + alerts to the admin **dashboard**.
- Sidebar: group **Quotes + Orders** under a **"Sales"** heading and add the unified pipeline entry.

### Verify
- Type-check (`npm run check` — ignore pre-existing unrelated errors), `npm run build`, and an end-to-end HTTP test (create order → confirm → mark entered → archived off active list → CSV export) using a temp customer + admin, cleaned up after (same pattern as the auth tests). Shared Neon DB — never delete real users/data.

---

## PHASE B — connect the two halves

- ✅ **B1 — Accept a quote → auto-create a linked order** (DONE 2026-06-25). When a customer accepts a quote, an order is created automatically from the quote's line snapshots, with `order.quote_id` set and status **"confirmed"** (a firm order ready to fulfil). Guarded against duplicates via `getOrderByQuoteId`. Wired into `PATCH /api/quotes/:id` (the accept path used by both customer screens); `createOrder` extended with optional `quoteId`/`status`. The accept response returns `orderId`. Admin **Sales** rows show "↳ from Q-x" on converted orders.
- ✅ **B2 — Consolidate the customer quote experience** (DONE 2026-06-25). `/portal/quotes` was a read-only dead-end; it now funnels into the existing rich detail/accept page (`/my-quotes/:id`) with **Review & respond** / **View details** buttons and shows the **linked order** ("Order #X") once accepted. The quote-detail page now surfaces "Order #X created — View in My Orders" after accept (and on revisits, by matching `order.quoteId`). The widely-linked `/my-quotes` stays as the canonical detail/accept flow; both list views share it.
- ⏳ **B3 — Proper PDF / emailed quotation** (NOT done). Today "mark as quoted" is a status + internal note; there's a customer email (`sendCustomerResponseEmail`) but no formal document. Next: a printable/PDF quotation (line items, prices, expiry) the admin can send. Lowest-risk v1 = a printable HTML quote view (browser "print to PDF"); later a real PDF + attach-to-email.

**Verified (B1+B2):** 13-assertion end-to-end test passed (accept → one linked confirmed order with copied line snapshots + carried total; duplicate-accept returns the same order, never a second; decline creates no order). Type-checks clean; build succeeds.

## PHASE C — inventory-aware niceties (LATER, optional)
- Low-stock warning when confirming an order.
- Optional pick/pack/ship sub-statuses.
- **API integration** to push orders straight into the inventory system (replaces manual/CSV).

## Conventions to respect (don't break)
- Admin pages must NOT self-wrap in `<AdminLayout>` — `AdminRoute` provides the shell; page root is a bare `<div className="space-y-6">`, no `p-6`.
- New DB columns/tables go in `server/db.ts` startup SQL as idempotent `ALTER/CREATE ... IF NOT EXISTS` (+ update `shared/schema.ts` types). `npm run db:push` does NOT migrate the live DB.
- Dev + prod share ONE Neon DB; deploying ships code only. Commit promptly (this project has lost uncommitted work to resets).
- Merge to main: `git branch -f main feature/price-list-builder && git push gitsafe-backup main` (don't `git checkout main`).
