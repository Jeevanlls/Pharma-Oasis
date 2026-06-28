# Category Price Lists + Monthly Promotions — Plan & Build Log

_Created 2026-06-28. Redrafted 2026-06-28 after owner decisions (below). Status: **Phase 1 being built this session.**_

This doc now covers **two** related additions to customer pricing:
1. **Category-based price lists** (alongside today's brand/supplier lists).
2. **Monthly Promotions** — a portal section, spanning multiple brands/categories, whose price **overrides** brand and category lists while it is live.

Both reduce to the same engine: a list produces `(EAN → preparedPrice)` rules; the only new hard problem is **which rule wins when an EAN reaches a customer from more than one list.** That is now solved by a single **precedence order**.

---

## ✅ OWNER DECISIONS (locked 2026-06-28)
1. **Precedence policy = brand-wins**, extended with promotions on top:
   **promotion (live) > brand list > category list > default (price on request).**
   Cheapest price breaks ties *within* the same tier.
2. **Monthly Promotions exist** as a new list scope. A promotion:
   - **Always wins** — when an EAN is in a live promotion, that EAN's brand/category price is **obsolete** for the duration.
   - Is **global** — one promotion, visible/applicable to **all** portal customers (no per-customer assignment).
   - Is a **single price for all** customers.
   - Is **time-bound with start + end dates** — it goes live and **auto-expires**, and prices **revert automatically** to brand/category lists when it ends. No manual un-publish needed.
3. Category lists and brand lists **may coexist** for the same customer; the resolver decides the price. (We do NOT force the admin to resolve overlaps at assign time — but we DO show them; see UX.)

---

## How pricing works today (verified in code, 2026-06-28)
### Schema (`shared/schema.ts`)
- **`priceLists`** (~1315) — one brand per list: `brandId` (nullable in Drizzle), `baseCostUploadId`, `defaultMarginPercent`, `status` (draft|published|archived), `publishedAt`/`archivedAt`. **No `scope`/`category` column yet.**
- **`priceListItems`** (~1496) — one row per product: `priceListId`, `costRowId`, **`ean`**, `description`, **`pricingCategoryId`** (exists, used for filtering only), `costPrice` (admin snapshot), `method` (margin|fixed|cost_plus), `marginPercent`/`fixedPrice`/`plusAmount`, **`preparedPrice`** (final customer price, materialized at save/refresh — not computed per request), `isActive`.
- **`customerPriceLists`** (~1529) — assignments: `customerId`, `priceListId`, `brandId` (denormalized, currently `NOT NULL`). **Unique `uniq_customer_brand` on `(customerId, brandId)`** → a customer holds ≤ 1 list per brand.

### Resolver — the critical path
- **`getCustomerItemByEan(customerId, ean)`** (`server/pricing-v2.ts` ~1137): gets the customer's assigned list IDs, finds `priceListItems` for that EAN in those lists, **returns the FIRST match. No precedence.**
- **`getCustomerItem(customerId, itemId)`** (~1122): fetches one item by id, restricted to the customer's lists (used when a line is added by `itemId`).
- Both feed **`buildPricedLines`** (`server/routes.ts` ~4823) which snapshots `preparedPrice` as the line `unitPrice` for quotes/orders.

### Why "first match" is safe today (and why the additions break it)
`uniq_customer_brand` + (one EAN = one brand) ⇒ an EAN reaches a customer through only one list ⇒ "first match" is the only match. **Category lists** (span many brands) and **promotions** (span everything) destroy that — the same EAN can now reach a customer via 2–3 lists at different prices, so "first match" becomes **non-deterministic**. The precedence order is the fix.

### Cost sourcing (brand-locked today)
- `getBaseCostForBrand(brandId)` (~152) and `buildPriceList({brandId})` (~223) assume one brand per list. Refresh/reconcile/cost-edit paths bail if `brandId` is null. (Generalizing these is **Phase 2**, not Phase 1.)

---

## The precedence model (the heart of it)
A product (EAN) may reach a customer from several lists at once. Resolve to **one** price by ranking:

| Rank | Source | Notes |
|------|--------|-------|
| 0 | **Live promotion** | `scope='promotion'`, `published`, and `now` within `[startsAt, endsAt]`. **Global** — applies to every customer. |
| 1 | **Brand list** | the customer's assigned list for that EAN's brand |
| 2 | **Category list** | the customer's assigned category list covering that EAN |
| 3 | **Default** | none → "price on request" (`unitPrice = null`) |

**Tie-break within a tier = cheapest `preparedPrice`.** (Mostly matters if two live promotions ever cover the same EAN.)

Promotions being global means the resolver checks them **independent of `customerListIds`** — a live promo EAN wins for everyone, even customers with no assigned lists.

---

## PHASE 1 — make it CORRECT (this session)
Goal: the **charged price** for any EAN is always the highest-precedence one, deterministically — *before* any category/promotion authoring UI exists. With no category lists or promotions created yet, **production behaviour is unchanged** (every existing list is `scope='brand'`, no promos exist), so this is safe to ship immediately.

### 1.1 Schema — idempotent `ALTER`s in `server/db.ts` startup SQL (project convention; shared dev+prod DB)
```sql
-- price_lists: scope tag, category target, promotion window
ALTER TABLE price_lists ADD COLUMN IF NOT EXISTS scope VARCHAR(20) NOT NULL DEFAULT 'brand'; -- brand | category | promotion
ALTER TABLE price_lists ADD COLUMN IF NOT EXISTS category_id INTEGER;   -- when scope='category'
ALTER TABLE price_lists ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP;   -- when scope='promotion'
ALTER TABLE price_lists ADD COLUMN IF NOT EXISTS ends_at   TIMESTAMP;   -- when scope='promotion'

-- customer_price_lists: generalize the per-customer uniqueness from "per brand" to "per scope target"
ALTER TABLE customer_price_lists ADD COLUMN IF NOT EXISTS scope    VARCHAR(20) NOT NULL DEFAULT 'brand';
ALTER TABLE customer_price_lists ADD COLUMN IF NOT EXISTS scope_id INTEGER;
UPDATE customer_price_lists SET scope_id = brand_id WHERE scope_id IS NULL;          -- backfill existing (all brand)
ALTER TABLE customer_price_lists ALTER COLUMN brand_id DROP NOT NULL;                 -- category rows have no brand
CREATE UNIQUE INDEX IF NOT EXISTS uniq_customer_scope ON customer_price_lists (customer_id, scope, scope_id); -- create NEW first
ALTER TABLE customer_price_lists DROP CONSTRAINT IF EXISTS uniq_customer_brand;       -- then drop OLD
```
Order matters: create the new unique index **before** dropping the old constraint, so the "one list per target" guarantee is never momentarily absent. After backfill (`scope='brand'`, `scope_id=brand_id`) the new index is equivalent to the old constraint for existing rows → no row can violate it. Promotions are **global** → they are NOT written to `customer_price_lists` at all.

Mirror these in Drizzle (`shared/schema.ts`): add `scope`, `categoryId`, `startsAt`, `endsAt` to `priceLists`; add `scope`, `scopeId` to `customerPriceLists`, make `brandId` nullable, replace the `unique(...)` with the `(customerId, scope, scopeId)` index.

### 1.2 Resolver — precedence + promotions (`server/pricing-v2.ts`)
- `rankScope(scope)`: brand→1, category→2, else→3.
- `activePromotionItemByEan(ean)`: items where `priceLists.scope='promotion'` AND `status='published'` AND (`startsAt` null OR ≤ now) AND (`endsAt` null OR ≥ now), `isActive`. Cheapest wins. **Global** (no customer filter).
- Rewrite `getCustomerItemByEan(customerId, ean)`:
  1. `const promo = await activePromotionItemByEan(ean); if (promo) return promo;`
  2. else fetch the customer's list items for that EAN (join `priceLists` for `scope`), sort by `rankScope`, then `preparedPrice`, return first.
- New drizzle imports needed: `or, isNull, lte, gte`.

### 1.3 Charged-price guarantee for BOTH line paths (`server/routes.ts` `buildPricedLines`)
The `itemId` path (`getCustomerItem`) resolves a specific item and would miss a live promo. After resolving `li`, re-resolve by EAN so promotions/precedence apply no matter how the line was added:
```ts
if (li?.ean) { const eff = await pricingV2.getCustomerItemByEan(user.id, li.ean); if (eff) li = eff; }
```
(The `productId`/EAN path already goes through `getCustomerItemByEan`.) Since the picked item's EAN is in the customer's lists, `eff` is always ≥ its precedence, so this only ever *upgrades* to a promo/higher-precedence price.

### 1.4 Verify (project pattern: temp rows on the real DB, then delete)
- Type-check + build green.
- Temp test the resolver matrix: (a) brand only → brand price; (b) brand + category overlap → brand wins; (c) + live promo → promo wins; (d) promo with `endsAt` in the past → ignored (reverts to brand); (e) promo for a customer with no lists → still applies. Delete all temp rows.

**Phase 1 explicitly does NOT touch:** category-list build/refresh, cross-brand cost sourcing, the portal Promotions section, or making `getCustomerCatalogue` show promo prices. Those are Phase 2 — and because no promos/category lists exist until then, there is no display-vs-charge mismatch in the meantime.

---

## PHASE 2 — make it USABLE
- **Category list authoring**: build/refresh a list whose product set is a category across member brands; generalize `getBaseCostForBrand` → gather latest **published** cost rows per product in the category (union across brands). `priceListItems` already carries per-row `ean`+`pricingCategoryId`+`costPrice`, so cross-brand items store fine.
- **Cost-edit propagation**: the Current Costs "apply" flow walks lists **by brand** — it must **also** refresh category lists and promotions containing a changed product, or their `preparedPrice` goes stale.
- **Category assignment**: generalize `assignCustomers` (today it throws if `!brandId` and checks conflict at brand level) to set `scope`/`scopeId` and conflict on `(customerId, scope, scopeId)`.
- **Monthly Promotions admin**: author a promotion (multi-brand/category product picker), set `startsAt`/`endsAt`, single price per EAN, publish. Global — no assignment step.
- **Portal**: a **Monthly Promotions** section; make `getCustomerItem`/`getCustomerCatalogue` promo-aware so the **displayed** price matches the **charged** price (promo EANs show the promo price / are flagged, and are visually "obsolete" on their brand/category rows).

## PHASE 3 — make it SAFE & CLEAR
- **Assign-time / publish-time conflict preview** (reuse Price Builder assign dialog + Who-Sees-What console):
  > "Publishing promo **June Deals** changes **34** products that are on customers' brand lists — here's old→new while it's live (until 30 Jun)."
- Optional **`customer_effective_price (customerId, ean, price, sourceListId)`** materialization, rebuilt on publish / assignment / cost edit / promo start+expiry. Buys speed (one indexed read on the quote hot path), auditability ("this £4.50 came from June Deals"), and a place to store detected conflicts. Note promo expiry must trigger a rebuild.

---

## Risk notes
- Shared dev+prod Neon DB → schema ships as idempotent `ALTER ... IF NOT EXISTS` in `server/db.ts` startup (no destructive migration). 22 real customer accounts — never delete rows. The v2 pricing tables (`price_list_items`, `customer_price_lists`, `pricing_brands`) have **no raw DDL in the repo** (only `price_lists` does); they exist live, so Phase 1 only **ALTERs** them — it does not try to CREATE them.
- The unique-constraint swap is the riskiest step — create the new index before dropping the old constraint; confirm no existing row violates `(customerId, scope, scopeId)` after backfill (it can't, given today's data).
- `getCustomerItemByEan` is live quote/order pricing — a wrong precedence silently mis-prices. Change behind the temp-row test matrix above.

## Open questions deferred to Phase 2 (not blocking Phase 1)
- Category list product set: all brands the customer is entitled to, or specific brands? (affects build, not the resolver)
- Cost basis for category/promotion items: latest published cost per product from its own brand's upload (assumed).
- Do promotions need an admin-set per-promo priority if two ever overlap, or is cheapest-wins enough? (cheapest assumed for now)

_Indexed from `SESSION_HANDOFF.md`. Companion docs: `CUSTOMER_PRICING_REDESIGN_PLAN.md`, `SALES_CONSOLIDATION_PLAN.md`._
