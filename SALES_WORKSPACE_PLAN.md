# Sales Workspace — New Quote & Order Management (design + build plan)

_Created 2026-06-26. Supersedes the old `/admin/quotes` & `/admin/orders` admin screens. Companion to `SALES_PIPELINE_PLAN.md` (pipeline foundations) and `SALES_CONSOLIDATION_PLAN.md` (single-channel D1–D3, DONE). Read those first._

## Goal (owner's words, 2026-06-26)
The old admin quote/order screens are unusable — opening a quote from the Sales pipeline lands on the old layout that **doesn't even show what products the customer requested**. **Discontinue the old quote & order system** and build a **new quote & order management experience under the Sales pipeline**, designed around what a **salesman** actually needs:
- See the customer's request (what they sent, quantities, details).
- Work the enquiry: price it, communicate, **send the quote**, receive confirmation, **close** the quote / sales order.
- A salesman can also **create & send a quote directly from the backend** (proactive).
- Once a sales order is **confirmed**, the salesman **downloads it as Excel or PDF** and processes it manually in our SaaS. Same for received orders.
- **Later:** connect an API so confirmed orders land in the SaaS automatically (replaces the manual download).

## Locked decisions (owner, 2026-06-26)
1. **Export format:** build a sensible default sales-order export now (columns: EAN, Description, Qty, Unit Price, Line Total, Customer, Delivery, Notes) as real **PDF + .xlsx**; remap to the SaaS's exact import columns when the API phase arrives.
2. **Communication:** **email + internal activity timeline** for this build (send quote/messages by email; log every send/status-change/download; customer responds via the portal accept/decline). Full in-portal threaded messaging is a later option.
3. **Sequencing:** **E1 first** (visibility), then iterate E2→E5; owner reviews each.
4. **Old pages:** **fully discontinue** — once the new workspace covers their functions, delete `/admin/quotes` & `/admin/orders`; their routes redirect into the Sales workspace.

## Architecture — one "Deal Workspace"
A quote and an order are the same deal at different stages (the tables stay separate + linked, per the locked pipeline decision). The detail/working experience is **one workspace** opened from the Sales worklist:
- Routes: `/admin/sales/quote/:id` and `/admin/sales/order/:id` (one page component that adapts by kind).
- Old `/admin/quotes`, `/admin/orders` list routes → redirect to `/admin/sales`. The Sales worklist "Open" buttons point at the workspace.

### Screen layout
- **Header:** ref (Q-12 / O-45), stage badge, customer name, total value, age; primary actions on the right (type-specific).
- **Line items (the gap today):** EAN · description · qty · unit cost *(admin-only)* · margin % · unit price · line total · grand total. Editable on quotes (price/qty/add/remove); read-only snapshot on confirmed orders.
- **Customer card:** company, contact, email, phone, assigned price list, link to their other deals.
- **Stage controls** + validity/expiry (quotes).
- **Notes:** internal (private) + a customer-facing message (sent with the quote).
- **Activity timeline:** created → sent → viewed → accepted/declined → confirmed → downloaded → entered (who/when).

### Workflows
- **Quote (customer- or salesman-initiated):** see request → price lines (cost + suggested margin from their price list) → add customer message + validity → **Send Quote** (email + printable/PDF link) → customer accepts in portal (or salesman records) → **auto-creates linked confirmed order** (already built, D1/B1) → or decline/close with reason.
- **Salesman-initiated quote:** "New Quote" from Sales → pick customer → build & price lines → send.
- **Sales order:** see confirmed lines → **Download PDF / Excel** → process manually in SaaS → **Mark "entered into inventory"** → archives (already built, Phase A) → later, API push.

## Phases (each shippable, verified the usual way: temp data + real endpoints, cleaned up; type-check + build)
- **E1 — Deal Workspace (visibility):** new `/admin/sales/quote/:id` & `/admin/sales/order/:id` page showing customer + line items + totals + a basic timeline (from existing status fields). Sales "Open" → workspace. Old list routes redirect. **Fixes the immediate complaint.**
  - Reuses existing data: `GET /api/admin/quotes/:id` (already returns items + customer), `GET /api/admin/orders/:id` (items + customer).
- **E2 — Quote pricing & send:** inline edit line qty/price (+ suggested margin from price list), add/remove lines, set validity, internal + customer notes, **Send Quote** email (extend `/api/admin/quotes/:id/respond`), record accept/decline (reuses accept→order). New: `PATCH /api/admin/quotes/:id/items`.
- **E3 — Order documents:** `GET /api/admin/orders/:id/document.pdf` (pdfkit) + `.xlsx` (xlsx) reusing `server/price-export.ts` patterns; download from the workspace; then Mark entered.
- **E4 — Salesman-initiated quote:** `POST /api/admin/quotes` (create for a customer with lines) + "New Quote" UI in Sales.
- **E5 — Activity timeline / comms log:** new `deal_events` table (idempotent in `server/db.ts`): `{ id, dealKind:'quote'|'order', dealId, type, actorId, message, createdAt }`; write events on send/status/download; render on the workspace.
- **E6 — API push (LATER, deferred):** push confirmed orders into the SaaS; remap export columns to its import schema. (Was Phase C.)
- **Cleanup:** delete `client/src/pages/admin/quotes.tsx` + `orders.tsx` and their now-unused endpoints once E1–E2 fully replace them.

## Data model
- No change for E1/E2/E3 (items + customer already exist; quote item edits use existing `quote_items`).
- E5 adds `deal_events` (idempotent `CREATE TABLE IF NOT EXISTS` in `server/db.ts` startup SQL + type in `shared/schema.ts`).

## Export — default columns (E3)
PDF (human-readable sales order doc, Pharma Oasis header, customer block, line table, totals, notes) + `.xlsx` with: `Order Ref, Date, Customer, EAN, Description, Quantity, Unit Price, Line Total, Delivery Notes`. Remap at E6 to the SaaS import schema.

## Conventions (don't break)
- Admin pages must NOT self-wrap `<AdminLayout>` (AdminRoute provides it); root is `<div className="space-y-6">`, no `p-6`.
- New DB tables/columns → idempotent SQL in `server/db.ts` (+ `shared/schema.ts`); `npm run db:push` does NOT touch the live DB.
- Dev + prod share ONE Neon DB; deploy ships code only. Commit promptly; sync main via `git branch -f main feature/price-list-builder && git push gitsafe-backup main`.
- Verify with temp users/data via the real endpoints, then delete temp rows. Never touch the 22 real customer accounts.

## Status
- **E1 — Deal Workspace (visibility): ✅ DONE (2026-06-26).** New `client/src/pages/admin/deal-workspace.tsx` at `/admin/sales/:kind/:id`: header (ref/stage/customer/value), **line-items table** (item, EAN, qty, cost*, margin, unit price incl. "On request", line total, grand total), customer card (company/contact/email/phone), notes (customer/reply/internal), and a basic activity timeline from existing fields. Sales worklist "Open" → workspace. Order detail endpoint now returns `customer` (`GET /api/admin/orders/:id`). Old `/admin/quotes` & `/admin/orders` kept reachable (unlinked) as a fallback for pricing/respond until E2, bridged by a temporary "Price / respond (classic)" link in the workspace. Fixed a real bug: customer field is `phoneNumber` not `phone`. **Verified 10/11 e2e** (company, email, items incl. price-on-request, secrets stripped, NEW order-customer all pass; the 1 fail was a test-only wrong field name, fixed in the component). Build + type-check clean.
- **E2 — Quote pricing & send: ✅ DONE (2026-06-26).** In the workspace, editable quotes (pending/quoted) now let the salesman edit/add/remove lines with live margin + total, **save prices** (`PUT /api/admin/quotes/:id/items`, recomputes total + margin, locked once accepted/declined), set **validity**, write a customer message + internal note, **Send quote** (`POST /api/admin/quotes/:id/send` → pending→quoted + emails the printable quotation), and **Mark accepted / declined** — accept creates the linked confirmed order (refactored shared `createOrderFromAcceptedQuote`, used by both the customer-portal accept and admin). **Old `/admin/quotes` & `/admin/orders` pages deleted**; routes redirect to `/admin/sales`; dashboard + quote-document links repointed. **Verified 14/14 e2e** (price+margin+total recompute, send→quoted+validity+note, admin-accept→linked confirmed order with carried total, edit-locked after accept). Build + type-check clean.
  - **Dropped UI features (note):** quote **versioning** UI and **order "respond" email** lived only on the deleted pages — their APIs still exist but have no UI now. Re-add to the workspace if needed.
- **E3–E6 pending.** Next: E3 (order PDF + Excel documents).
