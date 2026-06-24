# Price List Builder — Session Handoff

_Last updated: 2026-06-23. Written so a new agent (or future session) can continue seamlessly._

## Where we are

Working on branch **`feature/price-list-builder`** (off `main`, NOT yet merged). Three commits, all built + tested live + committed:

1. `fdf5340` — **Price List Builder** admin tool (recovered from a lost session that never committed it).
2. `856f339` — **Bulk pricing**: tiered cost bands + cost+£.
3. `e6e855d` — **Cost reconciliation**: review a new supplier cost before applying.

> Context: a previous session built the Price List Builder but the workspace reset before committing, so it looked like "nothing happened." It was all recovered and is now safely committed. **Commit work promptly.**

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
