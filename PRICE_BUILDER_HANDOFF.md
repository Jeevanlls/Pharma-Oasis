# Price List Builder — Session Handoff

_Last updated: 2026-06-25. Written so a new agent (or future session) can continue seamlessly._

## Where we are

Working on branch **`feature/price-list-builder`** (off `main`, NOT yet merged). Commits, all built + committed:

1. `fdf5340` — **Price List Builder** admin tool (recovered from a lost session that never committed it).
2. `856f339` — **Bulk pricing**: tiered cost bands + cost+£.
3. `e6e855d` — **Cost reconciliation**: review a new supplier cost before applying.
4. `4bba613` — **Fix cost-upload EAN matching** (compare vs prior published upload, not catalogue products).
5. `1d2b678` — **Interactive cost-upload review** (dedupe block, missing-info skip, keep/remove, notes, status filter). Built + type-checked + synthetic-tested.
6. `fa025c9` — **Cost-review refinements**: per-row **Delete** button; **big-change confirm tick** (gates Publish, keyed by EAN+cost); **real-time/live validation** (statuses + change% recompute as you type); **Notes column** in the download template + parser (Notes/Comment/Remark headers). Type-checked.
7. `e09ca03` — **Current Costs editor** (`/admin/current-costs`): pick a brand → see live costs + "published N days ago" badge → search → edit a few costs/notes → **Review & apply** confirm dialog showing every affected customer price (old→new cost, old→new price, per list + customers) → confirm publishes a NEW cost version (supersedes old) + reprices affected lists. Backend `getCurrentCosts`/`previewCostEdits`/`applyCostEdits` in pricing-v2; verified with a 12-assertion synthetic seed test (passed, data cleaned up).
8. `eafe2fc` — **Price Builder UX + Assignments overview + hide legacy** (2026-06-25): Price Builder left panel slimmed (300→220px) with a collapse toggle, working sheet reclaims width (`minmax(0,1fr)`) and is taller (72vh). Legacy `/admin/price-lists` **hidden from the sidebar** (route still registered in App.tsx — reversible, no data removed). New **Customer Assignments** overview at `/admin/assignments` (brand → list → customers), backed by `pricingV2.allAssignments()` + `GET /api/admin/v2/assignments`. Type-checked + built clean; endpoint verified live (401 when unauth).
9. `d15a9ec` — **Pricing UI clarity pass** (2026-06-25): sidebar tools numbered 1–6; every pricing screen has a "Step N — what to do" line; relabelled jargon ("Review new cost"→"Check for cost changes", "Bands & Cost+£"→"Bulk price (cost bands)"); safety cues (below-cost line count, amber 0-customers, "nothing changes until Confirm"). Built clean.

> Context: a previous session built the Price List Builder but the workspace reset before committing, so it looked like "nothing happened." It was all recovered and is now safely committed. **Commit work promptly.**

## 👉 RESUME HERE (last worked 2026-06-25 — Screen A tested OK by user; feature MERGED to main)

> **Update 2026-06-25:** The user click-tested **Screen A (Cost Uploads review)** — all working. They then asked for and approved four improvements, all now built + type-checked + built clean + committed (`eafe2fc`, `d15a9ec`): (1) Price Builder layout fix + collapsible list panel, (2) hidden the legacy Price Lists page, (3) new Customer Assignments overview, (4) full UI clarity pass (numbered steps, plainer labels, safety cues). The user said to **merge once the clarity pass was done**, so the branch was merged to `main` and pushed to `gitsafe-backup` (see "Merge status" below).
>
> **Still awaiting hands-on test by the user (not known-broken):** Screen B (Current Costs editor), the new Assignments overview, the Price Builder layout/collapse, and the clarity-pass wording. The one-list-per-brand-per-customer rule the user wanted is **already enforced** (assign-time 409 + replace prompt, plus a DB unique constraint on customer+brand) — no change was needed.
>
> **Dev server note:** the Replit workflow's auto-respawn proved unreliable this session; the dev server is currently running as a **manually-started background `npm run dev`** (port 5000, plain tsx — NO watch). If server files change again, restart it; front-end changes hot-reload.

<details><summary>Original 2026-06-24 resume note (for history)</summary>

> **For the next-session agent:** everything below was BUILT + type-checked + built clean + (for the backend) synthetic-tested, and the dev server was restarted so it's all live. The user has NOT yet click-tested it. When the user returns they will report what they found. **Do not re-build or assume anything is broken** — wait for their testing feedback, then fix only what they flag, or proceed to merge if they're happy. The exact things awaiting their hands-on test are in the "⚠️ PENDING YOUR TEST" list just below.
</details>

**State:** commits up to `e09ca03` are on the local branch. **Nothing is pushed.** The dev server (`npm run dev`, plain `tsx` — NO watch) was **restarted** (now running in the background, port 5000) so the new server code + routes are live; if you change server files again you MUST restart it (front-end Vite hot-reloads, server does not).

**Latest session (2026-06-24, later) added — all built, type-checked, built clean, server restarted:**
- Cost-upload review **delete-line + big-change confirm-tick + live validation + file Notes column** (`fa025c9`).
- **Current Costs editor** `/admin/current-costs` — quick-edit live costs with a customer-price impact confirmation, auto-applies + republishes (`e09ca03`). Synthetic test passed.
- ⚠️ Still NOT click-tested in the UI by the user; merge/push still pending user go-ahead.

**Why not pushed:** the only git remote is `gitsafe-backup` (a local backup mirror); its pre-receive hook **rejects every branch except `main`**. There is **no GitHub `origin`**. So the feature branch can't be pushed; the only route to the remote is **merge → `main`, then `git push gitsafe-backup main`**.

**Latest feature — interactive cost-upload review (`1d2b678`), built per the user's 2026-06-24 spec. Behaviour:**
- **Duplicate EANs**: every occurrence flagged; **publish hard-blocked** until fixed (server `publishUpload` throws; UI disables Publish). User can edit the EAN inline + Save to re-check, or fix the file & re-upload.
- **Missing EAN / cost** → "missing info"; editable inline. Decision (user-chosen): **publish the good lines and skip incomplete ones** (deleted, count reported) — NOT a full block.
- **Editable rows** (EAN, cost, qty, **Notes** column) + **editable upload comment** until published.
- **Status filter** dropdown (cost changed / new / duplicate / missing info / unchanged).
- **Missing products** (in last published costs, absent from new file): per-line **Keep at old price** (decision: **carried forward into this upload** at old cost) or **Remove**; Keep-all / Remove-all buttons.
- New endpoint `PATCH /api/admin/cost-uploads/:id/draft` re-validates via shared `analyzeRows()` + persists draft (`replaceDraftRows`). Save-before-publish wired in the UI.

**⚠️ PENDING YOUR TEST (what to click through next session) — nothing here is known-broken; these just haven't been hands-on tested by the user yet:**

A. **Cost Uploads review screen** (`/admin/cost-uploads`) — upload a brand file (e.g. the 436/413/309-row brand) and confirm:
   - Duplicate EANs flag + block Publish; **editing the EAN OR clicking the new red trash-icon** clears it **live as you type** (no Save needed); Publish re-enables.
   - A big cost change (beyond the ±% threshold box) shows a red **"confirm +X%"** tick that **must be ticked** before Publish enables.
   - Missing-info lines skip on publish (count reported); keep/remove carry-forward works; status filter works; NO "EAN not found".
   - Download the template → it now has a **Notes** column; fill it → those notes show after upload.
B. **Current Costs editor** (`/admin/current-costs`, NEW) — pick a brand → live costs + "published N days ago" badge → search → edit a few costs/notes → **Review & apply** → the confirm dialog lists every affected customer price (old→new cost, old→new price, per list + customers) → **Confirm & apply** republishes costs + reprices. Verify the toast counts and that customer prices actually moved.

**Then (only once the user is happy):**
1. **Merge + push** — merge `feature/price-list-builder` → `main`, then `git push gitsafe-backup main` (the feature branch itself can't be pushed — see "Why not pushed" above).
2. Possible follow-ups the user hinted at: dedupe **across the whole brand/system** (cost-upload dedupe is within-file only); persist bands so reconcile can re-apply them across band boundaries.

## ✅ FIXED 2026-06-24 — cost-upload EAN matching (was: KNOWN BUG below)

The bug below is now fixed in `server/cost-importer.ts` + `server/routes.ts` + `client/src/pages/admin/cost-uploads.tsx` (not yet committed).

**What changed:**
- `buildPreview` no longer queries the catalogue `products` table at all. It is now a **pure function** that takes the brand's **prior published cost upload rows** (fetched in the route via `pricingV2.getBaseCostForBrand(brandId)`) and matches uploaded EANs against those. Correct id namespace → "previous cost" and "change %" now populate.
- A brand-new EAN is now status **"new"** (blue), not an error. The bogus "No matching product (EAN not found)" flag and the `products.rrp`-based "Cost exceeds RRP" flag are gone (no rrp in the pricing-brand world).
- The preview now also returns a **`removed[]`** list — EANs that were in the prior published upload but are absent from the new file. The Cost Uploads page shows these in an amber "X product(s) … NOT in this upload" panel (**this addresses symptom (a)** — the ~20 dropped lines are now visible at upload time). Note: removal from existing price lists still happens via the Price List Builder's "Review new cost" (reconcile), as before.
- Summary fields renamed: `matched`→still matched (count of EANs seen before), added `newCount`, `removedCount` (was `unmatched`).
- Verified with a synthetic pure-function test: matched/new/removed counts, change %, big-change flag, and first-ever-upload (0 flagged) all correct.

**Symptom (a) caveat still true:** the Price List Builder reconcile only detects changes against the brand's *latest **published*** upload — a draft upload won't reconcile. That's by design.

<details><summary>Original bug report (for history)</summary>

User re-uploaded the same cost file with ~20 lines removed and saw: (a) the **missing 20 lines were not identified** by reconciliation, and (b) **every row flagged "No matching product (EAN not found)"**.

**Symptom (b) — root cause FOUND (real bug):**
- Cost Uploads page picks the brand from `pricing_brands` (`/api/admin/pricing-brands`) and passes that **pricingBrand id** to `buildPreview()` in `server/cost-importer.ts` (~line 149).
- `buildPreview` matches uploaded EANs against the **catalogue `products`** table: `db.select().from(products).where(eq(products.brandId, brandId))`.
- But `products.brandId` references the **catalogue `brands`** table — a DIFFERENT id namespace from `pricing_brands`. So the lookup returns ~nothing → every row is "unmatched" → "EAN not found" for all.
- This "match against catalogue products" is a legacy v1 concern (caching cost onto catalogue products). The v2 price-list reconciliation does NOT need it — `reconcilePreview` matches `cost_upload_rows.ean` vs `price_list_items.ean` directly.
- **Likely proper fix:** for v2, "previous cost"/matching should come from the brand's *prior published cost upload* (same `pricing_brands` id), not the catalogue `products` table. Decide with the user whether to (i) make `buildPreview` match against the previous cost upload's rows for that pricing brand, and/or (ii) just stop flagging "EAN not found" when running in the v2/pricing-brand flow. This is a design choice — confirm before changing.

**Symptom (a) — missing not detected — TOP HYPOTHESES to check:**
1. **Was the new upload PUBLISHED?** `reconcilePreview` (in `server/pricing-v2.ts`) only compares against the brand's *latest **published*** cost upload (`getBaseCostForBrand`). If the new file is still a **draft**, it compares the list to the OLD published cost → no missing/changes detected. CHECK THIS FIRST.
2. **EAN format mismatch.** `price_list_items.ean` was stored from the original build; `cost_upload_rows.ean` is stored raw (`r.ean || null` in `pricing-store.ts createDraftUpload`) — NOT normalized, while `buildPreview` uses `normEan()` for catalogue matching. If raw EANs differ in whitespace/leading-zero format between the two uploads, reconcile won't match them. Consider normalizing EAN consistently on store + in `reconcilePreview`.

**Debug steps for tomorrow:**
- Reproduce: note the exact pricingBrand, whether the new upload was published, and row counts.
- Query the DB: compare `cost_upload_rows.ean` for the brand's latest published upload vs `price_list_items.ean` for the list — are they present and same format?
- Confirm `reconcilePreview` is reading the new upload (check `getBaseCostForBrand` returns the new uploadId).
- Backend reconcile logic itself is unit-tested and works on matching EANs (see test history) — so the bug is almost certainly in EAN storage/format or the publish step, not the reconcile maths.

</details>

## What's built (all working)

**Price List Builder** — `/admin/price-builder` (Admin sidebar → Pricing → Price List Builder)
- Front end: `client/src/pages/admin/price-builder.tsx`
- Back end: `server/pricing-v2.ts` + routes in `server/routes.ts` (search `pricingV2`)
- A working sheet showing each product's **cost**, pricing **method** (margin % / fixed £ / cost+£), live customer price, real achieved margin, and a red **"below cost!"** warning.
- **Search** by product name or EAN.
- **Bulk pricing** ("Bands & Cost+£" button): tiered by cost band (e.g. up to £5→25%, £5–10→20%, £10–20→12%, above→10%) or flat cost+£. Bands read the **cost** price. Hand-edited lines and fixed £ prices are left untouched.
- **Assign / unassign** customers — one list per customer per brand (enforced).
- **"Review new cost"** button (cost reconciliation): compares the brand's latest published cost upload to the saved list and buckets every product — 🟡 changed (>25% jump flagged "are you sure?"), 🟢 new (add at chosen margin), 🔴 missing (KEPT at old price by default, tick to delete), ⚪ unchanged. Nothing applies until "Apply to list" is clicked.
- Portal never exposes cost or margin to customers.

## How the data flows (important for testing)
1. **Pricing Brands** (`/admin/pricing-brands`) → add a brand.
2. **Cost Uploads** (`/admin/cost-uploads`) → upload a supplier cost file for that brand → **Publish** it.
3. **Price List Builder** → New Price List → pick the brand → auto-fills every product from the published base cost at your default margin.
4. Edit lines / apply bands → **Save** → **Assign** to customers.
5. Next month: publish a new cost upload for the brand → in the builder click **Review new cost** → confirm changes → Apply.

## Verify it works
- Type-check changed files: `npm run check 2>&1 | grep -iE "price-builder|pricing-v2"` → should be empty.
  - NOTE: `npm run check` shows MANY pre-existing errors in OTHER files (messages/suppliers/offers/etc.). Those are unrelated and do NOT block the build.
- Build: `npm run build` → should end with "build complete!".
- The app runs on port 5000 (Replit workflow). It serves HTTP 200.
- DB is a shared Neon dev DB, usually empty. Test by seeding via the real `pricing-v2` functions and cleaning up (see how earlier `_pricetest.mts` / `_recontest.mts` were written — temp files, deleted after).

## Open / next steps (decide with the user)
- [ ] **Merge `feature/price-list-builder` to `main`** once the user is happy clicking around. (Pending the user's go-ahead.)
- [ ] Test end-to-end in the UI with a REAL brand + supplier cost file (only backend + synthetic data tested so far).
- [ ] Possible future: persist bands on the list so reconciliation can auto-reapply bands when a product's cost crosses a band boundary (user was undecided — currently bands are apply-time only).
- [ ] The reconciliation jump threshold is hard-coded at 25% (`BIG_CHANGE_PCT` in `server/pricing-v2.ts`). Could be made configurable.
- [ ] Old legacy "Price Lists (legacy)" page still exists at `/admin/price-lists`; decide whether to retire it.

## User context
- User (jeeratnam) is **non-technical**, owns the business side. Prefer simple, practical, plain-English explanations.
- Wants to avoid pricing mistakes/typos and accidental data loss — that's why reconciliation confirms changes and keeps missing products by default.
