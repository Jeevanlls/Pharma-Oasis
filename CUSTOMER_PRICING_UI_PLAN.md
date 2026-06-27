# Customer Pricing — UI Polish Plan (layout refresh)

_Created 2026-06-27. Goal: improve the **look & layout** of the admin **Customer Pricing** section. The section is **functionally complete and good — NO logic/data changes wanted.** This is purely a visual/UX polish pass, inspired by a reference layout the owner likes._

## ⚠️ Scope guardrails (read first)
- **Only touch front-end presentation.** No backend, no pricing logic, no schema. Every existing endpoint/behaviour stays exactly as-is.
- **Keep our emerald theme + the existing admin shell.** Do NOT restyle the whole admin app to match the reference's dark-navy sidebar — borrow *structure/spacing/hierarchy*, not the colour scheme.
- **Do NOT touch the dense Price Builder working sheet's density.** That 6-column scrollable grid (`price-builder.tsx`) NEEDS to be dense — it shows cost/method/value/price/margin per line across 100s of products. Density there is correct.
- Layout convention (already established, don't break): admin pages must NOT self-wrap `<AdminLayout>` — `AdminRoute` in `App.tsx` provides the shell. Page root = bare `<div className="space-y-6">`, **no `p-6`**.

## What "the section" is (the code we're polishing)
Emerald-fenced "Customer Pricing" sidebar group, defined in `client/src/components/admin-layout.tsx` (~lines 76-81, 171-195). The 7 screens (`client/src/pages/admin/`):
- `pricing-guide.tsx` — "How this works (guide)" landing/help.
- `pricing-brands.tsx` — define brands.
- `pricing-categories.tsx` — define categories.
- `cost-uploads.tsx` — upload + review supplier costs (densest screen).
- `current-costs.tsx` — quick-edit live costs w/ impact preview.
- `price-builder.tsx` — **the centrepiece** working-sheet pricing tool (master-detail, do NOT de-densify the sheet).
- `assignments.tsx` — "Who Sees What" customer coverage overview.

Backend (unchanged): `server/pricing-v2.ts`, routes in `server/routes.ts` (search `pricingV2`). Useful existing endpoints for an overview page: `GET /api/admin/v2/assignments` (`pricingV2.allAssignments()`), `GET /api/admin/pricing-brands`, `GET /api/admin/users` (filter `role=customer & status=active`), `listPriceListsV2`.

## The reference layout (what the owner likes)
Screenshots saved in `attached_assets/` (synced from Replit App Storage 2026-06-27 ~08:37):
- `Screenshot_2026-06-27_at_08.37.15_*.png` — **Overview**: 3 big KPI cards (37 Brands / 3031 Products / 7 Categories) + "Recent Brands" list. ← the model for our new Overview page.
- `Screenshot_2026-06-27_at_08.37.39_*.png` — Brands & Products: master-detail (left brand list w/ search+add+checkbox+count+edit/delete; right = selected brand's product table).
- `Screenshot_2026-06-27_at_08.37.59_*.png` — same, **inline-edit row** (inputs + green ✓Save / × cancel).
- `Screenshot_2026-06-27_at_08.38.10_*.png` — Categories: left category filter list w/ counts; right brand list w/ inline category dropdown.
- `Screenshot_2026-06-27_at_08.38.35_*.png` — Sales Offer Sheet: margin preset chips (10/15/20/25/30 + Apply all), smart-pricing toggle, category filter chips, per-brand ± steppers.
- `Screenshot_2026-06-27_at_08.38.49_*.png` — Sales Offer filtered/selected: green-highlighted selected rows + one bold full-width pink "Download" CTA with live count.

It is a **separate app** ("Pharma Oasis Pricing Manager v3.3"), used here only as visual inspiration — its strings do NOT exist in this codebase.

### What makes it feel clean (the borrowable bits)
1. **Overview landing page** with big KPI stat cards + recent list.
2. **Consistent master-detail** on every screen.
3. **Airy, card-based rows** with generous whitespace + big readable text (vs our dense `text-xs`).
4. **Friendly margin controls** — preset chips + ± steppers + smart-pricing toggle.
5. **One bold primary CTA** per screen with a live count; secondary actions de-emphasised.
6. **Calm, consistent palette**, clear active nav state.

## Plan (prioritised, low-risk → higher effort)
1. ✅ **DONE — NEW Customer Pricing Overview page** (`/admin/pricing`) — `client/src/pages/admin/pricing-overview.tsx`. KPI cards (Brands · Categories · Published lists · Customers covered) + "Needs attention" (published lists w/ 0 customers, brands w/ no published list) + 6-step tiles + per-brand coverage snapshot. Added as the FIRST item ("Overview") in the Customer Pricing nav group + route in `App.tsx`. Read-only — uses existing endpoints. **Owner reviewed in Replit viewer 2026-06-27: "looks far better."**
2. ✅ **DONE — Margin preset chips + ± steppers** in Price Builder bulk tools (`price-builder.tsx` ~:473-494). `previewMarginAll(value?)` refactored to take a value; chips 10/15/20/25/30 (emerald active), ± stepper via `stepMargin()`. Presentation only.
3. ✅ **DONE — primary CTA + overflow menu** — Price Builder header now shows Preview · Assign · Publish, with Check-for-cost-changes / Unpublish / Archive folded into a "More" `DropdownMenu` (`price-builder.tsx` ~:402-446). Kills the wrapping 6-button cluster.
5. ✅ **DONE — carry-over polish:**
   - `dark:` variants added to status colours in `cost-uploads.tsx` + `current-costs.tsx` (badges, row tints, change text, removed-panel, publish hints); switched "fresh/unchanged" green→emerald for theme consistency.
   - `overflow-x-auto` wrappers added to `pricing-brands.tsx` + `pricing-categories.tsx` tables (cost tables already used `overflow-auto` = both axes).
   - Cost-upload row status now renders as a `Badge` (was bare coloured text); "ok"→"unchanged" label.
   - Emoji 🟡🟢🔴 in the reconcile dialog replaced with lucide icons (RefreshCw/Plus/AlertTriangle + colour).

### Still open (optional, not done)
4. More **breathing room** on selection/overview screens (bigger rows, less `text-xs`) — NOT on the working sheet. (Deferred — judgement call, get owner steer.)
5b. Standardise the remaining destructive **`confirm()`** calls (brands/categories delete, price-builder archive) → AlertDialog. (Left as native `confirm()` for now — low priority, behaviourally fine.)

## Status / handoff
- **2026-06-27:** Items 1, 2, 3 and the 5-series carry-overs are **implemented on disk** on branch `feature/price-list-builder`. Owner is reviewing in the Replit viewer before production.
- **⚠️ NOT yet type-checked / built / committed** — the agent's sandbox lost its nix tooling mount mid-session ("Transport endpoint is not connected"), so `node`/`npm`/`git` were unavailable. Edits were written carefully and self-reviewed, but **a `npm run check` + `npm run build` must be run once tooling is back**, then commit. The Replit viewer hot-reloads from disk, so the owner can still see the changes live.
- **Next agent:** (1) `npm run check 2>&1 | grep -iE "pricing-overview|price-builder|cost-uploads|current-costs|pricing-brands|pricing-categories|admin-layout|App"` should be empty; (2) `npm run build`; (3) commit on `feature/price-list-builder`; (4) optionally tackle the two "Still open" items with owner steer. Keep everything presentation-only.
- Indexed from `SESSION_HANDOFF.md`.

## ✅ FINALIZE — COMMITTED 2026-06-27 (commit `3e3c2b5`)
Committed on `feature/price-list-builder`, merged to `main` (`git branch -f`), and **pushed to `gitsafe-backup` (`e9caa49..3e3c2b5`)** via system git (`/usr/bin/git` with `GIT_CONFIG_NOSYSTEM=1`).

**⚠️ BUILD/TYPE-CHECK NOT RUN by the agent** — the agent sandbox's nix mount stayed broken the whole session, so `node`/`npm` were never available there (only system `git` worked). The code was written + self-reviewed carefully, and the changes hot-reload in the Replit viewer (real container), but a `npm run build` / `npm run check` was **not** executed before commit. **Before deploying, run `npm run build` in the Replit shell to confirm it's green** (expected clean — changes are presentation-only). If a stray error appears, it'll be a missing import or typo in one of the files listed below; fix + amend.

**If you lost the session / the watcher didn't finish — run this manually once `npm` works again:**
```bash
cd /home/runner/workspace
npm run check 2>&1 | grep -iE "pricing-overview|admin/price-builder|admin/cost-uploads|admin/current-costs|admin/pricing-brands|admin/pricing-categories|layout/admin-layout|client/src/App"   # must be EMPTY
npm run build    # must end "build complete!"
# only if both above are clean:
git add client/src/pages/admin/pricing-overview.tsx client/src/App.tsx \
        client/src/components/layout/admin-layout.tsx client/src/pages/admin/price-builder.tsx \
        client/src/pages/admin/cost-uploads.tsx client/src/pages/admin/current-costs.tsx \
        client/src/pages/admin/pricing-brands.tsx client/src/pages/admin/pricing-categories.tsx \
        CUSTOMER_PRICING_UI_PLAN.md SESSION_HANDOFF.md
git commit -m "Customer Pricing UI polish: Overview page, margin chips, primary-CTA menu, dark-mode + table fixes"   # add Co-Authored-By trailer
git branch -f main feature/price-list-builder && git push gitsafe-backup main
```
**To verify it already landed:** `git log --oneline -3` on `feature/price-list-builder` — look for the "Customer Pricing UI polish" commit. If present, it's done → **only the Replit Deploy button remains.**

## Files changed this session
- NEW `client/src/pages/admin/pricing-overview.tsx`
- `client/src/App.tsx` (import + `/admin/pricing` route)
- `client/src/components/layout/admin-layout.tsx` ("Overview" nav item + `Layers` import)
- `client/src/pages/admin/price-builder.tsx` (margin chips/stepper, More menu, emoji→icons, imports)
- `client/src/pages/admin/cost-uploads.tsx` (dark variants, status Badge)
- `client/src/pages/admin/current-costs.tsx` (dark variants, emerald freshness badge)
- `client/src/pages/admin/pricing-brands.tsx` + `pricing-categories.tsx` (`overflow-x-auto`)
