# Session Handoff — START HERE next session

_Last updated: 2026-06-26 (end of session). This is the master index. Detailed docs are linked below._

## TL;DR for the next session
- All code is **committed on `feature/price-list-builder`, synced to `main`, pushed to `gitsafe-backup`**. Tree clean except the harness-managed `.claude/settings.local.json`.
- **⏯ NEXT ACTION = REDEPLOY + TEST, then build E3.** Production was deployed once today (commit `b875b44`), but **everything after that — D1–D3 (consolidation) and E1–E2 (new Sales Workspace) — is NOT on production yet.** Click Replit Deploy to push it live, smoke-test (below), then continue with **E3** (sales-order PDF + Excel) in **[SALES_WORKSPACE_PLAN.md](SALES_WORKSPACE_PLAN.md)**.
- **Nothing is known-broken.** Every phase was verified end-to-end against the real HTTP endpoints with temp data (cleaned up).

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
1. **Redeploy** (Replit Deploy button — no secret changes). This pushes D1–D3 + E1–E2 live.
2. **Smoke-test the new flow** (see "verification" below + SALES_WORKSPACE_PLAN.md test steps).
3. **Build E3** — sales-order **PDF + Excel** download from the workspace (libs already present: `pdfkit`, `xlsx` in `server/price-export.ts`). Full spec + remaining phases E4–E6 in **[SALES_WORKSPACE_PLAN.md](SALES_WORKSPACE_PLAN.md)**.

## How this project works (read before any change)
- **One shared Neon DB for dev AND production.** Deploying ships code only — no data migration, no data loss. The app uses `NEON_DATABASE_URL`. `npm run db:push` targets a *different, unused* DB, so it does NOT migrate the live DB. **Add schema changes as idempotent `ALTER/CREATE ... IF NOT EXISTS` in `server/db.ts` startup SQL** (+ types in `shared/schema.ts`). The live DB holds **22 real customer accounts — never delete user rows.**
- **Deploy** = Replit "Deploy/Publish" button (Cloud Run): build `npm run build`, run `node dist/index.cjs`. I cannot click it; it's a UI action. No GitHub remote — only `gitsafe-backup` (accepts `main` only).
- **Merge to main:** `git branch -f main feature/price-list-builder && git push gitsafe-backup main`. Do NOT `git checkout main` (harness keeps the tree dirty → checkout aborts).
- **Dev server:** `NODE_ENV=development tsx server/index.ts` on port 5000 (plain tsx, NO watch). Restart after server-file changes; front-end hot-reloads. The startup SQL block creates/alters tables on every boot.
- **Testing pattern:** spin temp users via direct DB + the real HTTP endpoints, assert, then delete the temp rows. Never touch real data. (`npm run check` has many pre-existing unrelated errors — only check the files you changed.)
- **Admin UI convention:** pages must NOT self-wrap in `<AdminLayout>` (the `AdminRoute` shell does it); root is a bare `<div className="space-y-6">`, no `p-6`.
- Commit promptly — this project has lost uncommitted work to workspace resets before.

## Detailed docs (the source of truth for each area)
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

### 3. Build E3 next (continue the Sales Workspace)
**E3 = sales-order PDF + Excel download** from the workspace (for manual processing in the SaaS). Libs already in repo: `pdfkit` + `xlsx` (`server/price-export.ts` has reusable patterns). Then E4 (salesman-initiated quotes), E5 (activity timeline table), E6 (API push — deferred). **Full spec for every E-phase is in [SALES_WORKSPACE_PLAN.md](SALES_WORKSPACE_PLAN.md).**

### Deferred / optional (unchanged)
- **Inventory-system API integration** — deferred by owner; becomes E6 (push confirmed orders into the SaaS). Until then: manual PDF/CSV/Excel handoff.
- Re-add **quote versioning** UI + order **"respond" email** to the workspace if needed (APIs still exist; UI was removed with the old pages).
- Optional: low-stock warning on confirm; pick/pack/ship sub-statuses; attach a real PDF to the quote email.

## Key files (this session's new/changed)
- **Consolidation (D1–D3):** `server/pricing-v2.ts` (`getCustomerItemByEan`), `server/routes.ts` (`buildPricedLines` unified resolver, order guard), `client/src/lib/basket.tsx` (unified basket + adapters), `client/src/pages/basket.tsx` (single checkout), `client/src/App.tsx` (routes/redirects), `admin-layout.tsx` (nav).
- **Sales Workspace (E1–E2):** `client/src/pages/admin/deal-workspace.tsx` (the workspace), `server/routes.ts` — `createOrderFromAcceptedQuote` helper, `PUT /api/admin/quotes/:id/items`, `POST /api/admin/quotes/:id/send`, admin accept→order on `PATCH /api/admin/quotes/:id`, customer-incl. `GET /api/admin/orders/:id`. Deleted: `client/src/pages/admin/{quotes,orders}.tsx`.
- Earlier (auth/pipeline): `server/twofa.ts`, `server/trusted-devices.ts`, `client/src/pages/admin/{security,sales}.tsx`, `client/src/pages/quote-document.tsx`.
