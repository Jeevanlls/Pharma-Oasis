# Price List Builder — Session Handoff

_Last updated: 2026-06-23. Written so a new agent (or future session) can continue seamlessly._

## Where we are

Working on branch **`feature/price-list-builder`** (off `main`, NOT yet merged). Three commits, all built + tested live + committed:

1. `fdf5340` — **Price List Builder** admin tool (recovered from a lost session that never committed it).
2. `856f339` — **Bulk pricing**: tiered cost bands + cost+£.
3. `e6e855d` — **Cost reconciliation**: review a new supplier cost before applying.

> Context: a previous session built the Price List Builder but the workspace reset before committing, so it looked like "nothing happened." It was all recovered and is now safely committed. **Commit work promptly.**

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
