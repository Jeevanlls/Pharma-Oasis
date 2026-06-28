# Session Handoff — START HERE next session

_Last updated: 2026-06-28. This is the master index. Detailed docs are linked below._

## ⭐ MOST RECENT (2026-06-28 pm) — Category Price Lists + Monthly Promotions: Phase 1 (CORRECT) shipped
Full spec + decisions + phasing in **[CATEGORY_PRICE_LISTS_PLAN.md](CATEGORY_PRICE_LISTS_PLAN.md)** (redrafted this session). On `feature/price-list-builder`; `npm run check` 0-errors + `build` green; resolver verified 6/6 on the live DB with temp rows (cleaned up).

**Owner decisions (locked):** precedence = **promotion (live) > brand > category > default**; promotions are **global**, **single price for all**, **time-bound with start+end dates that auto-expire/auto-revert**. Brand-wins between brand vs category.

**What Phase 1 did (makes pricing CORRECT before any new UI exists — zero production behaviour change until a category list/promotion is authored):**
- **Schema (idempotent ALTERs in `server/db.ts` startup, mirrored in `shared/schema.ts`)** — `price_lists`: `scope` ('brand'|'category'|'promotion', default 'brand'), `category_id`, `starts_at`, `ends_at`. `customer_price_lists`: `scope`+`scope_id` (backfilled from `brand_id`), `brand_id` now nullable; unique guard swapped `uniq_customer_brand` → **`uniq_customer_scope (customer_id, scope, scope_id)`** (new index created before old dropped). **Applied to live DB already** (runs on boot).
- **Resolver (`server/pricing-v2.ts`)** — `getCustomerItemByEan` rewritten: live global promotion wins, else brand-beats-category, cheapest breaks ties. New `activePromotionItemByEan` (published + now in [starts_at,ends_at]).
- **Charged-price guarantee (`server/routes.ts` `buildPricedLines`)** — the `itemId` line path now re-resolves by EAN so a live promo overrides whatever specific item was added (only ever upgrades the tier).

**⏯ NEXT = Phase 2 (make it USABLE):** category-list build/refresh + cross-brand cost sourcing; cost-edit propagation must also refresh category lists & promotions; generalize `assignCustomers` to `scope/scopeId`; **Monthly Promotions admin** (multi-brand/category picker, dates, single price, global); portal **Promotions section** + make `getCustomerCatalogue`/`getCustomerItem` promo-aware so displayed price = charged price. Phase 3 = assign/publish-time conflict preview + optional `customer_effective_price` materialization. (No category lists/promos exist yet → nothing to click-test on screen this phase.)

---

## ⭐ MOST RECENT (2026-06-28) — Pricing visual redesign v2 (emerald) + Who-Sees-What assignment tools
Read this first; it supersedes the 06-27 note below for the pricing pages. Full detail + verification in **[CUSTOMER_PRICING_REDESIGN_PLAN.md](CUSTOMER_PRICING_REDESIGN_PLAN.md)** → section "2026-06-28".

**Why:** the 06-27 facelift still didn't satisfy the owner. Owner pointed at the six "Pricing Manager v3.3" reference screenshots (in `/screenshots/` + `attached_assets/`) and clarified: **screenshots are for the VISUAL style only — menus/functions are fine; just make the visuals proper.** Owner chose to **KEEP EMERALD** (not the screenshots' navy/teal/pink).

**What got done this session (all on `feature/price-list-builder`; `npm run check` 0-errors + `build` green at every commit):**
- ✅ **Shared emerald visual system across all 6 pricing pages** (presentation-only, every `data-testid` preserved — counts verified vs HEAD). Emerald icon-chip headers; spreadsheet table chrome (tinted uppercase sticky headers, roomier `text-sm` rows, mono EANs, `tabular-nums`, `£`-prefixed cost inputs); a consistent status-colour language (green/amber/blue/red/grey); amber edited-row affordance; emerald CTAs + selected-row accents. Pilot on **Current Costs** (`7cfca19`, owner-approved), rolled to the other five (`d030c8d`).
- ✅ **Who Sees What (`assignments.tsx`) — NEW functionality** (real changes, reuses existing v2 assign/unassign endpoints):
  1. **Inline assign** of uncovered customers from the gap section (`dbe785a`).
  2. **Remove (×)** on each assigned customer + per-published-list **"Add a customer"** picker (`488faba`).
  3. **Master-detail brand rail** that scales to 80–100 brands (`54c9114`): searchable rail with per-brand **status dots** (🟢 covered / 🟡 gaps+count / 🟡 no-list / ⚪ none) + a **"Needs attention"** filter; right pane shows one brand's detail; mobile = brand dropdown.

**⏯ NEXT ACTION (owner):**
1. **Visual + functional click-through in a live admin session** (2FA-gated, can't be automated here): the 6 redesigned pages, and on **Who Sees What** — rail status dots, "Needs attention" toggle, gap-assign, per-list Add, Remove ×, and that coverage updates after each action. Server-surface was verified (assign/unassign return 401 real-auth-gate vs 200 SPA-fallback for fake routes); on-screen rendering was NOT browser-verified.
2. **Deploy (unchanged process):** `main` is stale → `git branch -f main feature/price-list-builder && git push gitsafe-backup main`, then Replit **Deploy** (agent can't click it).

Nothing known-broken; nothing half-done. Tree clean except harness-managed `.claude/settings.local.json` (and `/screenshots`, owner's reference images).

**Commits (after `7e0b538`):** `7cfca19` · `d030c8d` · `dbe785a` · `488faba` · `54c9114`.

---

## ⭐ MOST RECENT (2026-06-27 pm) — Customer Pricing redesign COMPLETE + type-check now clean
Read this first; it supersedes the older "Active UI work" note for the pricing pages.

**What got done this session (all on `feature/price-list-builder`):**
- ✅ **Customer Pricing tool-page redesign (Option B) — ALL 6 PAGES DONE.** Brands+Categories (`6388ae7`, prior session) · Who Sees What (`419d62e`) · Current Costs → master-detail (`6f99e17`) · Cost Uploads chrome (`ccdfe04`) · Price Builder left rail (`c1d978b`). Presentation-only; no logic/workflow/testid changes. Full per-page detail + "did I break anything?" checklist in **[CUSTOMER_PRICING_REDESIGN_PLAN.md](CUSTOMER_PRICING_REDESIGN_PLAN.md)**.
- ✅ **Fixed all 33 pre-existing `npm run check` type errors (`05c8f2a`)** — `npm run check` is now **0 errors** for the first time, build green. Two were **real runtime bugs**: reversed `apiRequest(url,{method})` args broke mark-read/delete/update on admin **Messages** and **Supplier Leads**. Also corrected field names that didn't match `shared/schema.ts`. Verification notes appended to the redesign plan (`d56616e`).
- ✅ **Tooling is back** in the agent sandbox — `npm run check` / `npm run build` / system `git` all work now (the prior sessions' nix-mount outage is over). Every commit this session was type-checked + built green first.
- ✅ **Server-surface verification done** for the behavioral fixes: built prod server booted on the live DB; the fixed mark-read/delete/update endpoints return 401 (real auth gate) vs 200 SPA-fallback for fake routes → proves the corrected calls hit real, method-correct endpoints.

**⏯ NEXT ACTION (owner decides — do NOT auto-deploy):**
1. **Visual click-through of the 6 redesigned screens** in the dev viewer — this is presentation work, so a human needs to eyeball it. Biggest change = **Current Costs** (new master-detail brand rail). The rendered fields on **Messages**/**Supplier Leads** could NOT be auto-verified (admin login is 2FA-gated + no browser automation in sandbox) → eyeball those in a live admin session: mark-read toggles, delete works, phone/proposal/category chips render.
2. **`main` is STALE** — it's at `6388ae7`, **6 commits behind** `feature/price-list-builder` (tip `d56616e`). If Replit Deploy ships `main`, sync first with `git branch -f main feature/price-list-builder && git push gitsafe-backup main` (see "How this project works"). Replit Deploy usually ships the current workspace = the feature branch, but confirm.
3. **Then deploy** (Replit Deploy button — agent can't click it).

Nothing is known-broken; nothing half-done. Working tree clean except harness-managed `.claude/settings.local.json`.

---

## TL;DR for the next session (Sales work — still pending deploy, separate from the pricing redesign above)
- All code is **committed on `feature/price-list-builder`, synced to `main`, pushed to `gitsafe-backup`**. Tree clean except the harness-managed `.claude/settings.local.json`.
- **⏯ NEXT ACTION = REDEPLOY + TEST.** Production was last deployed at commit `b875b44`, but **everything after that — D1–D3 (consolidation) and E1–E5 (new Sales Workspace) — is NOT on production yet.** Click Replit Deploy to push it live and smoke-test (below).
- **Sales Workspace E3–E5 are now DONE + verified (2026-06-27).** Order PDF/Excel documents, salesman-initiated "New quote", and the deal-events activity timeline are built. **The only remaining workspace phase is E6 (API push), deferred ~2 weeks by the owner.** Full detail in **[SALES_WORKSPACE_PLAN.md](SALES_WORKSPACE_PLAN.md)**.
- **Nothing is known-broken.** Every phase was verified end-to-end against the real HTTP endpoints with temp data (cleaned up). E3–E5: 24/24.

## 2026-06-27 session — what was done
- **E3 — Order documents:** `GET /api/admin/orders/:id/document.pdf` + `…/document.xlsx` (new `server/order-document.ts`), with PDF/Excel/CSV buttons in the workspace order header. Excel uses the locked default columns.
- **E4 — Salesman-initiated quote:** `POST /api/admin/quotes` + new `/admin/sales/new-quote` page (customer picker + line editor) + "New quote" button on the Sales worklist. Creates a pending quote → redirects into the workspace to price & send.
- **E5 — Activity timeline:** new idempotent `deal_events` table + `server/deal-events.ts`; events logged on create/priced/sent/accepted/declined/exported/entered; both GET detail endpoints return `events`; workspace Activity card renders the log (legacy deals fall back to status fields).
- **Verified 24/24** e2e on a temp port (temp admin w/ 2FA + temp customer, full lifecycle + document bodies + event log; temp rows deleted). Build + type-check clean.

## 2026-06-26 session — what was done (in order)
1. **Verified prior work + deployed.** 25/25 e2e on the Sales pipeline + 2FA; prepared **[DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md)**; owner **deployed to production** (`b875b44`). Secrets settled: `SESSION_SECRET` + `NEON_DATABASE_URL` already set (leave them); `SITE_URL` unset but code defaults to `https://pharmaoasis.co.uk` (optional).
2. **Single-channel consolidation D1–D3** (see **[SALES_CONSOLIDATION_PLAN.md](SALES_CONSOLIDATION_PLAN.md)**):
   - **D1** — one pricing resolver: main-catalogue quotes now use the customer's own price (matched by **EAN**), else "price on request"; orders require all lines priced. 12/12 e2e.
   - **D2** — one shared basket across public site + portal, single `/basket` checkout; deduped quote history. Build clean.
   - **D3** — single admin "Sales (pipeline)" nav line.
3. **New Sales Workspace E1–E2** (see **[SALES_WORKSPACE_PLAN.md](SALES_WORKSPACE_PLAN.md)** — the ACTIVE plan):
   - **E1** — `/admin/sales/:kind/:id` Deal Workspace showing customer + **line items** + totals + timeline (old pages never showed items). 10/11 e2e.
   - **E2** — editable quote pricing (add/remove lines, auto margin/total), **Send quote** (email), **Mark accepted/declined** (accept → linked confirmed order). **Old `/admin/quotes` & `/admin/orders` pages deleted** (routes redirect to `/admin/sales`). 14/14 e2e.
- **Dropped with the old pages (APIs still exist, no UI):** quote **versioning** + order **"respond" email**. Re-add to the workspace if the owner wants them.

## ⏭ WHAT TO DO NEXT SESSION (start here)
1. **Redeploy** (Replit Deploy button — no secret changes). This pushes D1–D3 + E1–E5 live.
2. **Smoke-test the new flow** (see "verification" below + SALES_WORKSPACE_PLAN.md test steps). New since last deploy: **New quote** button on Sales, **PDF/Excel** download on an order, and the richer **Activity** log on any quote/order.
3. **E6 (deferred ~2 weeks, ~2026-07-11)** — API push of confirmed orders into the inventory SaaS; remap `server/order-document.ts` columns to its import schema. Nothing else outstanding in the workspace except the optional re-adds (quote versioning UI, order "respond" email).

## How this project works (read before any change)
- **One shared Neon DB for dev AND production.** Deploying ships code only — no data migration, no data loss. The app uses `NEON_DATABASE_URL`. `npm run db:push` targets a *different, unused* DB, so it does NOT migrate the live DB. **Add schema changes as idempotent `ALTER/CREATE ... IF NOT EXISTS` in `server/db.ts` startup SQL** (+ types in `shared/schema.ts`). The live DB holds **22 real customer accounts — never delete user rows.**
- **Deploy** = Replit "Deploy/Publish" button (Cloud Run): build `npm run build`, run `node dist/index.cjs`. I cannot click it; it's a UI action. No GitHub remote — only `gitsafe-backup` (accepts `main` only).
- **Merge to main:** `git branch -f main feature/price-list-builder && git push gitsafe-backup main`. Do NOT `git checkout main` (harness keeps the tree dirty → checkout aborts).
- **Dev server:** `NODE_ENV=development tsx server/index.ts` on port 5000 (plain tsx, NO watch). Restart after server-file changes; front-end hot-reloads. The startup SQL block creates/alters tables on every boot.
- **Testing pattern:** spin temp users via direct DB + the real HTTP endpoints, assert, then delete the temp rows. Never touch real data. (`npm run check` has many pre-existing unrelated errors — only check the files you changed.)
- **Admin UI convention:** pages must NOT self-wrap in `<AdminLayout>` (the `AdminRoute` shell does it); root is a bare `<div className="space-y-6">`, no `p-6`.
- Commit promptly — this project has lost uncommitted work to workspace resets before.

## Active UI work
- **[CUSTOMER_PRICING_REDESIGN_PLAN.md](CUSTOMER_PRICING_REDESIGN_PLAN.md)** — see the **2026-06-28** section first: emerald visual-system v2 across all 6 pages **+ new Who-Sees-What assignment tools** (inline assign, per-list add/remove, master-detail brand rail for 80–100 brands). Earlier 06-27 Option-B facelift + 33 type-error fixes also documented. On `feature/price-list-builder`, check clean, build green. **Remaining = owner click-through + deploy** (see "⭐ MOST RECENT" at top).
- **[CUSTOMER_PRICING_UI_PLAN.md](CUSTOMER_PRICING_UI_PLAN.md)** — 2026-06-27 (phase 1, DONE, committed `3e3c2b5`): Overview page + light polish pass. Reference screenshots in `attached_assets/` (08:37–08:38).

## Detailed docs (the source of truth for each area)
- **[CATEGORY_PRICE_LISTS_PLAN.md](CATEGORY_PRICE_LISTS_PLAN.md)** — 2026-06-28 **DESIGN/DISCUSSION ONLY (not building yet).** How to add **category-based** price lists alongside brand lists, and how to resolve the price conflict when a customer is on both a brand list and a category list for the same products. Key finding: the resolver `getCustomerItemByEan` is already silent "first-match" with no precedence — categories make that non-deterministic, so a precedence rule is mandatory. Includes policy options (brand-wins recommended), the 3 concrete code changes, phasing, and open questions for the owner.
- **[AUTH_HANDOFF.md](AUTH_HANDOFF.md)** — login hardening, 2FA, trusted devices, break-glass SQL.
- **[SALES_WORKSPACE_PLAN.md](SALES_WORKSPACE_PLAN.md)** — ACTIVE: new quote & order management (Deal Workspace) replacing the old admin pages; phases E1–E6 (E1 done).
- **[SALES_CONSOLIDATION_PLAN.md](SALES_CONSOLIDATION_PLAN.md)** — single-channel D1–D3 (DONE): unified pricing, one shared basket, single admin nav.
- **[SALES_PIPELINE_PLAN.md](SALES_PIPELINE_PLAN.md)** — quotes+orders rework, phases A/B/C, the unified lifecycle.
- [PRICE_BUILDER_HANDOFF.md](PRICE_BUILDER_HANDOFF.md) — earlier pricing tool work + DB topology details.

---

## DONE this session

### 1. Auth hardening (see AUTH_HANDOFF.md)
- **P1** — removed the hardcoded admin password; env-driven bootstrap.
- **P2** — removed the public staff "Login" link; private unlinked **`/staff`** sign-in.
- **P3** — **team invites by email** (admin invites → invitee sets own password). Owner confirmed working.
- **P4** — **2FA (Google Authenticator / TOTP), required for admins.** Forced enrolment at first admin login; backup codes; `/admin/security` page to regenerate/disable.
- **Trusted devices** — "Remember this device for 30 days" checkbox skips the code on that browser; revocable.
- **Old admin password rotated** — `admin@pharmaoasis.com` reset by the owner (confirmed in DB).

### 2. Sales pipeline — quotes + orders (see SALES_PIPELINE_PLAN.md)
Decision: **one unified pipeline on screen, quotes + orders stay as linked records underneath.** Inventory handoff = manual entry / CSV for now (API later).
- **Phase A** — new **`/admin/sales`** unified worklist (KPIs, search/filter, Active/Archived tabs, bulk actions), the **"Entered into inventory → Archive"** handoff (one-click + bulk, stamps who/when), per-order **CSV export**, order **status rules**, dashboard "Orders to handle" alert. New order columns: `quote_id`, `entered_to_inventory_at`, `entered_by`, `archived_at`.
- **Phase B1** — accepting a quote **auto-creates a linked, confirmed order** (no re-entry; duplicate-guarded).
- **Phase B2** — consolidated the customer quote screens (portal quotes is now actionable + shows the linked order).
- **Phase B3** — **printable/PDF quotation** at `/quotes/:id/print` (browser "Save as PDF"); linked from customer + admin + the quote email.

---

## WHAT'S NEXT (pick up here)

### 1. Redeploy (owner, no code) → see [DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md)
Click Replit Deploy to push D1–D3 + E1–E2 live. No secret changes needed. ⚠️ 2FA enforced for admins; break-glass SQL in AUTH_HANDOFF.md.

### 2. Smoke-test the new flow on the live site
- **Quote (the main fix):** as a customer, add a product → `/basket` → "Request Quote". As admin: **Sales → Open** the quote → you now SEE the line items → price them, add a line, Save → set validity + message → **Send quote** (customer gets email) → **Mark accepted** → a linked **O-** order is created.
- **Order:** Sales → Open an order → view lines + customer → CSV export → "Mark entered into inventory" → moves to Archived.
- **Pricing:** a logged-in customer's main-catalogue quote uses THEIR price when the EAN is in their assigned price list, else "price on request".

### 3. Sales Workspace — E3/E4/E5 DONE (2026-06-27); only E6 remains
E3 (order PDF + Excel), E4 (salesman-initiated quotes), and E5 (activity timeline / `deal_events`) are built + verified. **E6 (API push) is deferred ~2 weeks by the owner.** **Full spec for every E-phase is in [SALES_WORKSPACE_PLAN.md](SALES_WORKSPACE_PLAN.md).**

### Deferred / optional (unchanged)
- **Inventory-system API integration** — deferred by owner; becomes E6 (push confirmed orders into the SaaS). Until then: manual PDF/CSV/Excel handoff.
- Re-add **quote versioning** UI + order **"respond" email** to the workspace if needed (APIs still exist; UI was removed with the old pages).
- Optional: low-stock warning on confirm; pick/pack/ship sub-statuses; attach a real PDF to the quote email.

## Key files — 2026-06-27 (E3–E5)
- **E3:** `server/order-document.ts` (new — xlsx + pdf builders), `server/routes.ts` (`/api/admin/orders/:id/document.{pdf,xlsx}`), `client/src/pages/admin/deal-workspace.tsx` (PDF/Excel buttons).
- **E4:** `server/routes.ts` (`POST /api/admin/quotes`), `client/src/pages/admin/new-quote.tsx` (new), `client/src/App.tsx` (route), `client/src/pages/admin/sales.tsx` ("New quote" button).
- **E5:** `server/deal-events.ts` (new), `shared/schema.ts` + `server/db.ts` (`deal_events` table), `server/routes.ts` (event logging across send/price/accept/decline/create/export/enter + `events` in GET detail), `deal-workspace.tsx` (Activity render).

## Key files — 2026-06-26 (this session's new/changed)
- **Consolidation (D1–D3):** `server/pricing-v2.ts` (`getCustomerItemByEan`), `server/routes.ts` (`buildPricedLines` unified resolver, order guard), `client/src/lib/basket.tsx` (unified basket + adapters), `client/src/pages/basket.tsx` (single checkout), `client/src/App.tsx` (routes/redirects), `admin-layout.tsx` (nav).
- **Sales Workspace (E1–E2):** `client/src/pages/admin/deal-workspace.tsx` (the workspace), `server/routes.ts` — `createOrderFromAcceptedQuote` helper, `PUT /api/admin/quotes/:id/items`, `POST /api/admin/quotes/:id/send`, admin accept→order on `PATCH /api/admin/quotes/:id`, customer-incl. `GET /api/admin/orders/:id`. Deleted: `client/src/pages/admin/{quotes,orders}.tsx`.
- Earlier (auth/pipeline): `server/twofa.ts`, `server/trusted-devices.ts`, `client/src/pages/admin/{security,sales}.tsx`, `client/src/pages/quote-document.tsx`.
