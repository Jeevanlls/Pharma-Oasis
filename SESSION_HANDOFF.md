# Session Handoff — START HERE next session

_Last updated: 2026-06-26 (end of session). This is the master index. Detailed docs are linked below._

## TL;DR for the next session
- All code work is **committed and merged to `main`** and pushed to `gitsafe-backup`. Working branch is `feature/price-list-builder` (kept in sync with `main`). Tree is clean except the harness-managed `.claude/settings.local.json`.
- Two big workstreams were completed earlier: **(1) Auth hardening** and **(2) Sales pipeline (quotes + orders) rework**. Both are built, type-checked, built clean, and each piece passed an end-to-end test.
- **Nothing is known-broken. Production has NOT been deployed yet** — that's the next action (owner clicks Replit Deploy). See **[DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md)**.

## 2026-06-26 session — what was done
- **Verified the Sales pipeline + 2FA end-to-end against the REAL HTTP endpoints** (temp data, cleaned up after): **25/25 checks passed.** Covered: customer accepts quote → linked confirmed order (B1), duplicate-accept blocked, admin 2FA login (real TOTP), order stats, active/archived worklists, CSV export, "entered-to-inventory" stamps + archive, and 2FA rejecting a bad code. Real data untouched.
- **Confirmed production build compiles clean** (`npm run build` → `dist/index.cjs`, 3.1 MB).
- **Prepared [DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md)** (full step-by-step deploy + smoke test + rollback).
- **Secrets resolved — no action needed before deploy:**
  - `SESSION_SECRET` — already set in Repl Secrets; **leave as-is** (overwriting logs everyone out).
  - `NEON_DATABASE_URL` — already set; deployment inherits it.
  - `SITE_URL` — env var is unset, but **every code usage falls back to `https://pharmaoasis.co.uk`**, so prod links are already correct. Setting it is optional/cosmetic.
  - (`DEPLOY_SECRETS.txt` was a throwaway helper holding a *suggested* SESSION_SECRET — unused since one already exists; safe to delete, gitignored, never committed.)

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

## WHAT'S NEXT (pick up here tomorrow)

### Operational (owner / deploy — no code) → see [DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md)
1. **Deploy to production** when ready (Replit Deploy button — owner UI action). **No secret changes are required** before deploying (see 2026-06-26 notes above: `SESSION_SECRET` + `NEON_DATABASE_URL` already set, `SITE_URL` safely defaulted in code). Build/run already correct: build `npm run build`, run `npm run start`.
   - ⚠️ After deploy, 2FA is enforced for admins on production — have the authenticator app + backup codes ready. First prod admin login forces 2FA enrolment (QR + backup codes). Break-glass SQL is in AUTH_HANDOFF.md.

### Features not yet built
2. **Phase C — inventory-system API integration: ⏸ DEFERRED by owner.** When resumed: find out which inventory system it is + whether it has an API (auth, endpoints, order payload). Until then, manual entry + CSV export (Phase A) is the handoff.
3. **Phase C small/optional** (not started): low-stock warning when confirming an order; pick/pack/ship sub-statuses.
4. **B3 follow-up** (optional): attach a real generated **PDF** to the quote email instead of a link (needs a server-side PDF library).

### Suggested verification when the owner returns (nothing known-broken, just not human-click-tested)
- 2FA: sign in at `/staff` → QR setup → code → land in `/admin`; tick "remember this device"; check `/admin/security`.
- Sales: `/admin/sales` — accept a "quoted" quote as a customer → order appears (status confirmed, "from Q-x"); "Mark entered into inventory" → moves to Archived; CSV export; open `/quotes/:id/print` and Save as PDF.

## Key endpoints / files added this session
- Auth: `server/twofa.ts`, `server/trusted-devices.ts`, `client/src/pages/admin/security.tsx`, login flow in `client/src/pages/login.tsx`; endpoints in `server/routes.ts` (search `2fa`, `team/invite`).
- Sales: `client/src/pages/admin/sales.tsx`, `client/src/pages/quote-document.tsx`; order methods in `server/pricing-store.ts`; endpoints in `server/routes.ts` (search `/api/admin/orders`, `/api/admin/quotes/:id`).
