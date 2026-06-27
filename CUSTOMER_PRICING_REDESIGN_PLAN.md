# Customer Pricing — Tool-Page Redesign Plan (reference-layout facelift)

_Created 2026-06-27. Owner approved **Option B**: redesign the actual Customer Pricing **tool pages** to match the reference layout ("Pharma Oasis Pricing Manager v3.3" screenshots in `attached_assets/`). This is the follow-on to `CUSTOMER_PRICING_UI_PLAN.md` (which delivered the Overview page + a light polish pass)._

## 🚨 HARD CONSTRAINTS (read every time)
- **NO functionality changes. NO workflow changes.** Every button, action, endpoint call, mutation, query, state variable, validation, toast, dialog, and `data-testid` stays **exactly** as-is. We only change the **presentation layer (JSX markup + Tailwind classes)**.
- Concretely, for each page: **do not touch** the `useQuery`/`useMutation` hooks, the handler functions (`handleX`, `onClick` bodies), the `useState` declarations, the `useMemo`/`useEffect` logic, the API paths, or the conditions that gate buttons. Only restyle/restructure the returned JSX.
- **Keep the emerald theme + the admin shell.** Borrow the reference's *structure/spacing/hierarchy*, NOT its dark-navy sidebar. Pages stay inside the existing `AdminRoute` shell (bare root `<div className="space-y-6">`, **no `p-6`**).
- **Keep every `data-testid`** on the same element it's on now (so any tests / muscle memory keep working).
- **Keep the Price Builder working-sheet density** — that dense table is correct; only its surrounding chrome may be freshened.
- **Preserve the "Step N" helper lines** (the plain-English guidance) — restyle, don't delete.
- Commit promptly after each page (this project has lost uncommitted work to resets). System `git` works (`/usr/bin/git` with `GIT_CONFIG_NOSYSTEM=1`) even while the nix tooling mount is down.

## ⚠️ Verification (agent sandbox can't compile)
The agent's nix mount is down → no `node`/`npm` here, so **I cannot run `npm run check`/`npm run build`.** Process:
1. Edit a page (presentation only), self-review JSX balance + imports.
2. **Owner runs `!npm run build` (or just hard-refreshes the dev viewer)** and reports OK / error.
3. Fix any reported error, then commit that page.
Because changes are presentation-only and incremental (one page at a time), a break is easy to localise. **Do NOT batch all 6 pages before the first verification.**

## 🎨 Shared design system (the reference look, in our emerald theme)
Derived from the reference screenshots. Reusable conventions to apply across all pages:
- **Page header:** big title (`text-2xl font-bold`) with a lucide icon in emerald; muted subtitle keeping the **"Step N — …"** helper. Optional right-aligned primary action.
- **Cards:** white, `rounded-lg border`, generous padding (`p-5`/`p-6`); section title with a small icon; clear `CardDescription`.
- **Airy list rows (replace dense CRUD tables):** each item is a roomy **row-card** — `flex items-center justify-between` with name in `font-semibold`, a muted meta sub-line ("category · N products"), status `Badge`, and ghost edit/delete icon buttons on the right. Generous `py-3`/`gap-3`, hover `hover:bg-muted/40`, `divide-y` between rows. Text at `text-sm`, **not** `text-xs`.
- **Master–detail:** left rail (search + "Add" + scrollable list of row-cards, selected = emerald tint + `border-emerald-300`), right detail pane (the data table / editor). Grid `lg:grid-cols-[280px_minmax(0,1fr)]`, collapses to single column below `lg`.
- **Filter chips:** rounded-full pill buttons (`rounded-full`), active = `bg-emerald-600 text-white`, inactive = `outline` — like the reference category chips.
- **Margin / number controls:** `−  [input]  +` steppers + preset chips (already shipped in Price Builder; reuse the pattern).
- **Primary CTA:** ONE prominent emerald button per screen (`bg-emerald-600 hover:bg-emerald-700`), full-width where the reference uses a banner CTA; secondary actions are `outline`/`ghost` or in a "More" menu.
- **Stat strip (optional):** small KPI chips at the top of a page where a count helps (mirrors the Overview cards, smaller).
- **Spacing:** more whitespace overall — `space-y-6` between cards, `gap-4` in grids.
- **Dark mode:** every new color must use theme tokens or include a `dark:` variant (no bare `bg-*-50`).

## 📄 Per-page redesign spec
For each: **Keep identical** = the logic that must not change. **Restyle** = the visual change.

### 1. Brands — `pricing-brands.tsx`
- **Keep identical:** `useQuery(["/api/admin/pricing-brands"])`, create/edit `Dialog` + its mutation, delete mutation + the `confirm()` guard, `openEdit`, all `data-testid`s (`row-brand-*`, `button-edit-brand-*`, `button-delete-brand-*`, add button).
- **Restyle:** replace the dense `Table` with **airy row-cards** (brand name `font-semibold`, sort-order + Active/Inactive `Badge` as meta, edit/delete ghost icons right). Bigger header with `Building2` icon. Keep the "Step 1" helper. Empty state as a centered card.

### 2. Categories — `pricing-categories.tsx`
- **Keep identical:** `["/api/admin/pricing-categories"]` query, create/edit dialog + mutation, delete mutation + `confirm()`, `data-testid`s (`row-category-*`, etc.).
- **Restyle:** same airy row-card treatment as Brands (it's the CRUD twin). `Tag` icon header. Keep "Step 2" helper.

### 3. Cost Uploads — `cost-uploads.tsx` (densest; most care)
- **Keep identical:** ALL of it — upload `handleUpload`, `preview` state + the live `liveRows`/`counts` re-derivation, `patchRow`/`removeRow`, `keepRemoved`, `confirmedChanges`, `statusFilter`, every mutation (`saveDraftMut`/`publishMut`/`deleteMut`/`saveThreshold`), `handlePublish`, the threshold input, the review/removed tables' editable inputs, the duplicate/confirm gating, every `data-testid`.
- **Restyle:** freshen the **3 cards** (upload form, review, history) with the design system — bigger section headers w/ icons, roomier upload form grid, the summary `Badge` chips as a clean strip, status as the `Badge` already added. The dense **review/removed tables stay** (functional inline edits) but get the cleaner card chrome + a clear single primary "Publish" CTA with secondary actions beside it. History table → airier rows.

### 4. Current Costs — `current-costs.tsx` (best master-detail candidate)
- **Keep identical:** brand `useQuery`/select, `edits` state + `editPayload` memo, `setCost`/`setNote`/`resetEdits`, `openConfirm`/`applyChanges`, the preview `Dialog` (impact table), the freshness badge logic, search filter, every input.
- **Restyle:** convert the single-column "pick brand → table" into **master-detail** like the reference Brands&Products: left rail = brand list as selectable row-cards (replaces the `Select`, but the **same `setBrandId`** drives it — selection logic unchanged), right pane = the live-costs table (kept) with the freshness badge + search + Review&apply CTA. Brand `Select` may remain as a fallback on narrow screens. Keep "Step 4" helper.

### 5. Price Lists (Price Builder) — `price-builder.tsx` (already master-detail)
- **Keep identical:** EVERYTHING — it's the most complex page. All queries/mutations/edit state, the reconcile/bulk/assign/preview dialogs, margin chips + steppers + More menu (just shipped), the dense working sheet.
- **Restyle (light only):** align the left rail + header chrome to the shared design system (row-card list styling, spacing, header icon). **Do NOT de-densify the working table.** Lowest priority — it's already closest to the reference.

### 6. Who Sees What — `assignments.tsx`
- **Keep identical:** all 4 queries, `brandViews` memo, search, the `<details>` disclosures, deep-links to `/admin/price-builder`, coverage math.
- **Restyle:** apply the airy card system + the emerald/amber coverage banners (already themed) — bigger per-brand cards, roomier customer-chip clusters, consistent header. Mostly spacing/hierarchy.

## ✅ Per-page "did I break anything?" checklist (run before commit)
- Every `data-testid` from the old file still present (grep-diff the testids).
- Every `onClick`/handler/mutation/query referenced exactly as before (no renamed/dropped handlers).
- All buttons that existed still exist and are gated by the same conditions.
- No new network calls or endpoint paths.
- JSX balanced; all icons/components used are imported.
- Owner confirms the screen still *does* what it did (click-through).

## Order of work (incremental, verify between)
1. **Brands** + **Categories** (twins, simplest, lowest risk) → owner verifies → commit.
2. **Who Sees What** (mostly spacing) → verify → commit.
3. **Current Costs** (master-detail conversion) → verify → commit.
4. **Cost Uploads** (densest, most care) → verify → commit.
5. **Price Builder** (light chrome only, last) → verify → commit.

## Progress tracker
- [x] 1. Brands — pricing-brands.tsx — airy row-cards (count badge, emerald active, hover, dashed empty state). Table import removed. Dialog + all testids/handlers unchanged. **Awaiting owner verify.**
- [x] 2. Categories — pricing-categories.tsx — same row-card treatment. **Awaiting owner verify.**
- [x] 6. Who Sees What — assignments.tsx — airy spacing pass: rounded-lg banners/list-cards, bigger emerald brand-card titles, roomier customer-chip clusters, dashed empty state, hover on list rows. All logic/testids/links unchanged. **Type-checked + `npm run build` green (agent ran it — tooling restored). Awaiting owner verify.**
- [ ] 4. Current Costs — current-costs.tsx
- [ ] 3. Cost Uploads — cost-uploads.tsx
- [ ] 5. Price Builder — price-builder.tsx (light)

## Status / handoff
- **2026-06-27:** plan written; starting with Brands + Categories. Branch `feature/price-list-builder`. Tooling mount down in agent sandbox → verify via owner's `!npm run build` / dev viewer; commit per page via system git.
- Indexed from `SESSION_HANDOFF.md`. Companion: `CUSTOMER_PRICING_UI_PLAN.md` (phase 1, done).
