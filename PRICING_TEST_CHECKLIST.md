# Customer Pricing — Test Checklist & Follow-up (Category lists · Promotions · Conflict preview)

_Created 2026-06-28. Owner-facing test plan for the work built this session. If this session is lost, START HERE plus [SESSION_HANDOFF.md](SESSION_HANDOFF.md) and the design source-of-truth [CATEGORY_PRICE_LISTS_PLAN.md](CATEGORY_PRICE_LISTS_PLAN.md)._

## Status at a glance
- **All built on branch `feature/price-list-builder`.** `npm run check` 0 errors, `npm run build` green.
- **Verified by automated function/route tests on the live DB** (temp rows, cleaned up): precedence 6/6 · promotions 15/15 · category 9/9 · UI list-contracts 4/4. Routes confirmed auth-gated (401).
- **NOT yet done:** owner visual click-through (2FA admin — can't be automated here) and **deploy**.
- **Commits this session (oldest→newest):**
  - `f8eb006` — Phase 1: precedence resolver + scope schema
  - `4e468cf` — Monthly Promotions (admin + portal)
  - `2dbda05` — Category price lists (Phase 2) + assign-time conflict preview (Phase 3)
  - `9db8d08` — UX review fixes + guide updated

## What this delivered (plain English)
1. **Precedence engine** — every product resolves to ONE price by rule: **live promotion > brand list > category list > price-on-request** (cheapest breaks ties). This is the safety backbone; nothing visibly changes until you create a promotion or category list.
2. **Monthly Promotions** — global, time-bound deals that override brand/category prices while live and auto-revert. New admin page + customer portal tab.
3. **Category price lists** — one list spanning a category across every brand, alongside brand lists; they coexist (brand wins on overlap). Built into the Price Builder.
4. **Assign-time conflict preview** — "Preview impact" shows which prices change for which customers before you commit an assignment.
5. **Guide updated** — `/admin/pricing-guide` now covers categories + promotions.

---

## MANUAL TEST CHECKLIST (do these in a live admin session)
Log in as admin (2FA). Tick each as you go.

### A. Monthly Promotions — admin (`/admin/promotions`, sidebar "7. Promotions")
- [ ] **Create**: "New promotion" → name it (e.g. "Test Promo") → leave dates empty → Create. It appears in the left list as **Draft**.
- [ ] **Add products**: in the detail pane, search the picker by product name or EAN → results appear → type a £ price on a result → **Add**. The product moves into "Products on this promotion".
- [ ] **Dedupe**: try adding the same product again — it should refuse ("Already on this promotion").
- [ ] **Edit price**: change a promo price inline (blur the field) — it saves.
- [ ] **Remove**: trash-icon a product — it leaves the list.
- [ ] **Schedule**: set Starts = (a minute ago) and Ends = (tomorrow). Switch to another promotion and back — **the dates must stay correct** (this was a bug; verify the fix).
- [ ] **Publish**: click Publish → badge shows **Live** (green).
- [ ] **Unpublish / Archive**: both work; archived promos drop off the default list.

### B. Monthly Promotions — customer (portal "Promotions" tab)
- [ ] Log in as a **customer** (or use Preview if available). Open the **Promotions** tab in the portal header.
- [ ] The live promotion's products show with the **promo price** and an emerald "Promotion" badge.
- [ ] **Add to basket** works from the Promotions page.
- [ ] On the normal **Catalogue**, a promoted product the customer also has on a list now shows the **promo price** (displayed = charged).
- [ ] **Expiry**: set the promotion's End date to the past (admin) → refresh the portal → the product reverts to its normal brand/category price, and the Promotions tab no longer lists it.

### C. Category price lists — admin (`/admin/price-builder`, "5. Price Lists")
- [ ] **Create**: "New Price List" → toggle **Category** → pick a category → name it → Create & auto-fill. It builds with products **from every brand** in that category (item count > 0, assuming those brands have published costs).
- [ ] The selected-list header shows **"Category: <name>"** (not blank — this was a bug; verify the fix).
- [ ] In the saved-lists panel, the filter dropdown has **"Category lists"**; the card is labelled as a category list.
- [ ] **Price it & publish** like any list (margin/fixed/cost+£; Save; Publish).
- [ ] **Refresh / Check for cost changes** works on a category list.

### D. Coexistence + brand-wins (the core rule)
- [ ] Pick a **customer** who is (or you assign) on a **brand list**. Also assign them the **category list** that covers some of the same products.
- [ ] Both assignments stick (no "replace" forced) — a brand list and a category list **coexist**.
- [ ] For a product on **both**, the customer's price = the **brand** price (brand wins). Check via the customer's catalogue / a quote.

### E. Assign-time conflict preview (Phase 3)
- [ ] In the Price Builder, open **Assign** on a list, tick some customers, click **Preview impact**.
- [ ] Assigning a **brand** list to a customer who only has the **category** list → preview shows the products **changing** (category → brand price).
- [ ] Assigning a **category** list to a customer who already has the **brand** list → preview shows **"No prices change"** (brand-wins). 
- [ ] Changing the ticked customers clears the old preview (no stale numbers).

### F. Cost-edit propagation
- [ ] With a category list live, go to **Current Costs**, edit a cost for a brand whose product is in that category, **Review & apply**. The impact preview should list **both** the brand list and the **category list**. After apply, the category list's price for that product updates too.

### G. Guide
- [ ] `/admin/pricing-guide` shows **Step 7: Promotions**, a Brand/Category mention in Step 5, and updated rules/glossary.

---

## Deploy (when you're happy)
The **schema is already live** (it applied on boot during verification). Only the **code** needs shipping:
1. `git branch -f main feature/price-list-builder && git push gitsafe-backup main`
2. Click Replit **Deploy/Publish**.
(2FA enforced for admins; break-glass SQL in `AUTH_HANDOFF.md`. Never delete user rows — 22 real customers.)

## Known follow-ups (not bugs — refinements)
- **"Who Sees What" (`/admin/assignments`) is still brand-rail only.** Category assignments appear but aren't grouped by category there yet. Most substantive remaining gap.
- Promotions: add products one at a time (no bulk multi-select); the "Scheduled / ended" badge lumps not-started-yet with already-ended; picker needs a search term before showing results.
- A promotion with zero items can be published (harmless — shows nothing).
- **Deliberately deferred:** the optional materialized `customer_effective_price` table (speed-only; rebuild-trigger risk on the shared prod DB > benefit). Auditability is already covered by `effectivePriceForCustomer`. See CATEGORY_PRICE_LISTS_PLAN.md → Phase 3.

## Re-running the automated verification (for a future session / engineer)
The function-level tests were persisted to **`scripts/pricing-verification/`** (they create sentinel temp rows on the live DB and delete them). Run from repo root:
```
NODE_ENV=development npx tsx scripts/pricing-verification/test-precedence.ts
NODE_ENV=development npx tsx scripts/pricing-verification/test-promotions.ts
NODE_ENV=development npx tsx scripts/pricing-verification/test-category.ts
NODE_ENV=development npx tsx scripts/pricing-verification/test-listshapes.ts
```
Each prints `N/N passed`. They never touch real customer/list rows (sentinel ids like 99xxxx + `__TMP_…` names).
