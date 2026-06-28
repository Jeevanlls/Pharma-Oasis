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
- [x] 4. Current Costs — current-costs.tsx — converted to master-detail: left brand rail (selectable row-cards + filter, drives same `setBrandId`), Select kept as `lg:hidden` mobile fallback. Freshness badge moved into Live-costs header; added loading + dashed "select a brand" empty states. All edit logic (`edits`/`editPayload`/`setCost`/`setNote`/`openConfirm`/`applyChanges`), the product table inputs and preview Dialog unchanged. One presentation-only `brandSearch` state added for the rail filter. **Type-checked + build green. Awaiting owner verify.**
- [x] 3. Cost Uploads — cost-uploads.tsx — chrome freshen only (densest page, logic untouched): page header gets an Upload icon + full-width (dropped max-w-6xl so the dense 9-col review table breathes), Review card title gets a ClipboardCheck icon, table/removed-panel wrappers → rounded-lg, history table wrapped in overflow-x-auto. ALL upload/preview/review/publish logic, the live status re-derivation, every editable input and mutation unchanged. **Type-checked + build green. Awaiting owner verify.**
- [x] 5. Price Builder — price-builder.tsx (light) — left-rail row-cards aligned to the shared design system: rounded-lg + p-3.5, emerald-tint selected state (matches the Current Costs rail), single-source `hover:bg-muted/40` (removed the now-redundant inner `hover-elevate`). Header already had the Coins icon + Step 5 helper. Working sheet density untouched; all queries/mutations/dialogs/testids unchanged. **Type-checked + build green. Awaiting owner verify.**

## Status / handoff
- **2026-06-27:** plan written; starting with Brands + Categories. Branch `feature/price-list-builder`. Tooling mount down in agent sandbox → verify via owner's `!npm run build` / dev viewer; commit per page via system git.
- **2026-06-27 (later session):** ✅ **ALL 6 PAGES DONE.** Agent tooling restored, so every page was `npm run check`-clean (no errors in our files) + `npm run build` green before each commit. Commits on `feature/price-list-builder`:
  - Brands + Categories — `6388ae7` (prior session)
  - Who Sees What — `419d62e`
  - Current Costs (master-detail) — `6f99e17`
  - Cost Uploads (chrome) — `ccdfe04`
  - Price Builder (light rail) — this commit
  - Pre-existing `npm run check` has 33 errors in **unrelated** files (suppliers/offers/messages/admin-categories/product-detail) — present before this work, untouched by it.
  - **Remaining:** owner click-through verify of each redesigned screen in the dev viewer, then the Replit **Deploy** button.
- Indexed from `SESSION_HANDOFF.md`. Companion: `CUSTOMER_PRICING_UI_PLAN.md` (phase 1, done).

## Cleanup — 33 pre-existing type errors FIXED (`05c8f2a`, 2026-06-27)
Not part of the redesign; a separate sweep so `npm run check` is finally clean. **0 errors (was 33), `npm run build` green.** Files: `messages.tsx`, `suppliers.tsx`, `categories.tsx`, `admin/offers.tsx`, `hooks/use-page-tracking.ts`.
- Two were **real runtime bugs**, not just type noise: `apiRequest(url, {method})` had its args reversed (helper is `apiRequest(method, url)`) in **messages** (mark-read/delete) and **suppliers** (update/delete) → the old code produced an invalid HTTP method + `/[object Object]` URL, so those actions never worked.
- Also corrected fields that didn't match `shared/schema.ts`: messages `isRead`→`status==="read"`, dropped non-existent `subject`/`company` (title now "Enquiry from {name}"); suppliers `phone`→`phoneNumber`, `message`→`proposalSummary`, `productCategories[]`→split of the `productCategoriesSupply` text field. Plus two nullable-boolean `Switch` coercions and an optional `description` prop on `PageTracker`.

### Verification (2026-06-27, tooling restored — ran the real app)
Verdict **PASS** on the behavioral fix (the part that was actually broken), at the server surface. The admin GUI itself could not be driven here (no Playwright + admin login is mandatory-2FA-gated with unknown creds), so the field *rendering* was not browser-screenshotted — flagged for owner click-through.
- Booted the built prod server (`node dist/index.cjs`) on the live DB; `/api/health` 200.
- The 4 endpoints the fixed client calls (`PATCH/DELETE /api/admin/messages/:id(/read)`, `PATCH/DELETE /api/admin/supplier-leads/:id`) all return **401** (real `requireAdmin` gate) — whereas **non-existent** API routes return **200** (SPA fallback). So 401 is discriminating: the fixed targets are real, correctly method-routed, auth-gated routes.
- Confirmed the served bundle (`dist/public/assets/index-*.js`) contains the fixed strings (`Enquiry from`, `Proposal Summary`, `productCategoriesSupply`, `phoneNumber`) and the old broken `…/read`,{method` shape is **gone**.
- **Owner to eyeball in a live admin session** (only place 2FA can be satisfied): one message (mark-read toggles, delete removes) + one supplier lead (phone, proposal summary, category chips render).

---

# 2026-06-28 — Visual redesign v2 (emerald system) + Who-Sees-What assignment tools

_Owner said the 06-27 facelift still didn't look right. Reviewed the six "Pharma Oasis Pricing Manager v3.3" reference screenshots (now also in `/screenshots/`, originals in `attached_assets/` dated 06-27 08:37–08:38). Owner clarified: **screenshots are for the VISUAL style only — menus & functions are fine; just make the visuals proper (distinguish with colour, clearer changes, proper inline-edit tables).** Owner chose to **KEEP EMERALD** as the accent (NOT the screenshots' navy/teal/pink). All work on `feature/price-list-builder`; `npm run check` exit 0 + `npm run build` green at every commit._

## A. Shared emerald visual system (applied to all 6 pricing pages)
Presentation-only — no logic/workflow/`data-testid` changes (testid counts verified identical to HEAD on every page). The conventions:
- **Emerald icon-chip page header:** a `h-11 w-11 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400` square holding the lucide icon, beside `text-2xl font-bold tracking-tight` title + the existing "Step N" subtitle.
- **Spreadsheet table chrome:** tinted **sticky** header row (`bg-muted/60`) with **uppercase, letter-spaced** labels (`text-[11px] uppercase tracking-wider font-semibold text-muted-foreground`); roomier body rows (`text-sm`, `h-9` inputs where it was `text-xs`/`h-8`); `font-mono` EANs; right-aligned `tabular-nums` numbers.
- **`£`-prefixed cost inputs:** a `pointer-events-none absolute` "£" inside the input (`pl-5`/`pl-4`), so cost fields read as money.
- **Status-colour language (consistent everywhere):** 🟢 emerald = live/published/active/unchanged · 🟡 amber = draft/unsaved/changed · 🔵 blue = new · 🔴 red = error/duplicate/below-cost/large-change · ⚪ grey = inactive/superseded.
- **Edited-row affordance:** amber row tint + amber dot next to the EAN + amber input border/focus-ring.
- **Emerald primary CTAs:** `bg-emerald-600 hover:bg-emerald-700 text-white`. **Emerald left-accent** (`border-l-4 border-l-emerald-500`) on selected rows in master-detail rails.

### Per-page (commits `7cfca19` pilot, `d030c8d` the other five)
| Page | File | What changed |
|---|---|---|
| **Current Costs** (pilot) | `current-costs.tsx` | Icon-chip header · spreadsheet table chrome · £-prefixed New-cost input · amber edited dot+border · emerald Review/Confirm CTAs · emerald left-accent on selected brand rail. Owner approved this look → became the template. |
| **Brands** | `pricing-brands.tsx` | Emerald icon-chip header · emerald "Add Brand" CTA. (Rows were already airy row-cards.) |
| **Categories** | `pricing-categories.tsx` | Emerald icon-chip header · emerald "Add Category" CTA. |
| **Who Sees What** | `assignments.tsx` | Emerald icon-chip header (then heavily extended — see section B). |
| **Cost Uploads** | `cost-uploads.tsx` | Icon-chip header · tinted uppercase headers on **all 3** tables (review/removed/history) · £-prefixed + `tabular-nums` New-cost input · emerald "Upload & preview" + "Publish" CTAs. Dense 9-col review table kept dense (per constraint). |
| **Price Builder** | `price-builder.tsx` | Light touch: icon-chip header · tinted uppercase working-sheet header · emerald "New Price List" CTA · emerald left-accent on selected list. Dense working sheet untouched. |

## B. Who Sees What (`assignments.tsx`) — NEW functionality (owner-requested)
This page went from a read-only report to a full assignment console. **These are real functional changes** (not presentation-only). Reuses the existing **v2 endpoints** the Price List Builder uses — no new server code.

**Endpoints used** (`server/routes.ts`):
- `POST /api/admin/v2/price-lists/:id/assign` body `{ customerIds:number[], replace:boolean }` (or `{ all:true }`). Returns `{ assigned, conflicts }`; **409** `{ message, assigned, conflicts }` when a customer already has a *different* list for that brand and `replace` is false. (route ~`routes.ts:4654`)
- `POST /api/admin/v2/price-lists/:id/unassign` body `{ customerId }`. (route ~`routes.ts:4677`)
- One-list-per-brand is enforced server-side → the 409 path drives a "Replace it?" `confirm()`.
- On success both `["/api/admin/v2/assignments"]` and `["/api/admin/v2/price-lists"]` queries are invalidated so coverage/counts update live.
- Shared client helper `assignRequest(listId, customerIds, replace)` (module-scope in `assignments.tsx`) does the fetch + 409 detection.

1. **Inline assign for uncovered customers** (commit `dbe785a`) — in each brand's "customers who can't see this brand" gap `<details>`, the `GapAssign` component: a per-customer **Assign** button, an **Assign all N to "List"** button, and a **list picker** that appears only when the brand has >1 published list. (Only shows when the brand HAS a published list; otherwise the "create one in Price Builder" note stays.)
2. **Remove + per-list Add-customer** (commit `488faba`) — `ListRow` component: every assigned customer chip gets a **×** (Remove → `/unassign`); every **published** list gets an **"Add a customer…"** Select (approved customers not already on it) + emerald **Assign** button. Doubles as a move-between-lists tool (409 → replace prompt). Threaded the list **id** into the per-brand view's `listMap` so both actions can target the right list.
3. **Master-detail brand rail — scales to 80–100 brands** (commit `54c9114`) — replaced the vertical stack of every brand card with a `lg:grid-cols-[300px_minmax(0,1fr)]` layout:
   - **Left rail** (`hidden lg:block`): search (brand/list/customer) + a **"Needs attention"** toggle (filters to brands with gaps OR no published list; shows the count) + a scrollable list of brand buttons, each with a **status dot** — 🟢 covered · 🟡 gaps (shows count badge) · 🟡 "no list" · ⚪ no customers. Selected = emerald left-accent.
   - **Right pane** = `BrandPanel` (extracted from the old inline card) renders the selected brand's full coverage + gap-assign + per-list add/remove.
   - **Mobile fallback** (`lg:hidden`): a brand `Select` above the detail pane.
   - Selection state `selectedBrandId` defaults to the first brand in the (filtered) rail via `?? railList[0]`.
   - New testids: `rail-brand-{id}`, `toggle-needs-attention`, `select-brand-mobile`, `add-select-{listId}`, `add-assign-{listId}`, `unassign-{listId}-{customerId}`, `gap-assign-{id}`, `gap-assign-all-{brand}`.

## Verification (2026-06-28)
- `npm run check` exit 0 and `npm run build` complete after **every** commit.
- The `/assign` and `/unassign` routes confirmed **real + admin-gated (401)** on the running dev server (port 5000), vs **200** SPA-fallback for a fake sibling route — proving the new client calls hit real, method-correct, auth-gated endpoints.
- **NOT browser-verified** (admin login is 2FA-gated, no Playwright in sandbox): the actual on-screen rendering + the assign/remove click-throughs. **Owner to eyeball in a live admin session** — especially Who-Sees-What: rail status dots, "Needs attention" filter, gap-assign, per-list Add, Remove ×, and that coverage updates after each action.

## Commits this session (on `feature/price-list-builder`, all after `7e0b538`)
- `7cfca19` Current Costs visual system (pilot)
- `d030c8d` roll emerald visual system to remaining 5 pages
- `dbe785a` Who Sees What: assign uncovered customers inline
- `488faba` Who Sees What: Remove + per-list Add-customer actions
- `54c9114` Who Sees What: master-detail brand rail (scales to 80–100 brands)

## Still open / next
- **Owner visual click-through** of all 6 pages + the Who-Sees-What assignment actions (above).
- **Deploy** unchanged from the 06-27 process: `main` is stale → sync `git branch -f main feature/price-list-builder && git push gitsafe-backup main`, then Replit **Deploy** (agent can't click it).
- **Optional / not done:** KPI stat-strip on Brands/Categories (needs a count the page doesn't fetch yet); rounded-pill filter chips on Price Builder's brand/active-archived filters; same brand-rail treatment could be applied elsewhere if wanted.
