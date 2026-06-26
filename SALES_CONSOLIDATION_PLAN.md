# Sales Consolidation — Single-Channel Plan (advisory)

_Created 2026-06-26. Companion to `SALES_PIPELINE_PLAN.md`. Written in response to the owner's two concerns after the first production deploy. **No code changed yet — this is the proposal to approve before building.**_

## The owner's two concerns
1. As a logged-in customer, "add product → send for quote" went through the **old quote route**, not the new sales pipeline. We want **one single channel** — discontinue the parallel quote/order lines.
2. There are **two product levels**, and that's intentional:
   - **Main/advertised products** (home + `/products`): shown with **no price**; a customer can still "Add to Quote".
   - **Portal products** (`/portal`): the **customer-pricing** list prepared for and assigned to that account; here they see prices and can **order or request a quote**.
   - A customer may add from **either** level — but **every** quote/order must flow through the **one** sales pipeline, and the **separate quote & order lines should be removed**.

---

## What exists today (audited 2026-06-26)

### Two customer submission paths write to the SAME tables
| Path | Entry (frontend) | Endpoint | Pricing | Items carry |
|---|---|---|---|---|
| **OLD (main catalog)** | `/products` → `useQuoteBasket` (localStorage `…_quote_basket`) → `/quote` | `POST /api/quotes` (routes.ts:934) | `product.wholesalePrice` | `productId` only |
| **NEW (portal)** | `/portal` → `usePortalBasket` (localStorage `…_portal_basket`) → `/portal/basket` | `POST /api/portal/quotes` / `POST /api/portal/orders` (routes.ts:4728 / 4693) | customer price list (`preparedPrice`) | `productId` **+** `priceListItemId` |

- **Why two exist:** `buildPricedLines` (routes.ts:4665) calls `pricingV2.getCustomerItem()` and **throws if the item isn't in the customer's price list**. So the portal route is *strict* (price-list only); the old route is the *loose* fallback for main-catalog products. That is the real root cause — main products simply can't go through the portal endpoint today.
- **Both create `quotes` rows** (status `pending`) → so both **already appear** in the admin Sales worklist (`/admin/sales` merges `/api/admin/orders` + `/api/admin/quotes`, sales.tsx:60–62). The pipeline link works; the **fragmentation is in the experience**, not the data destination.

### Customer-facing screens are doubled
- Quotes: `/my-quotes` (public) **and** `/portal/quotes` (both read from `GET /api/quotes`; portal one already funnels into `/my-quotes/:id`).
- Orders: only `/portal/orders` (no public-site order flow).
- Two baskets with two localStorage keys.

### Admin still shows three nav lines
`admin-layout.tsx:65–67`: **Sales (pipeline)**, **Quotes**, **Orders** — the old Quotes (`/admin/quotes`) and Orders (`/admin/orders`) pages were intentionally *kept* last session as detail/action screens that Sales links to via "Open".

### Locked design decision (still correct, do NOT undo)
`quotes` and `orders` stay as **separate linked tables** underneath; "single channel" = one workflow/one set of screens, **not** one merged table. Merging would lose quote-only concepts (expiry, versions) and order-only concepts (fulfilment/handoff).

---

## Recommended end state

**One channel, two product levels feeding it, linked records underneath.**

```
 Customer basket (ONE basket)
   ├─ main product (no customer price)  ─┐
   └─ portal product (customer price)   ─┤
                                         ▼
         ONE submission endpoint resolves price per line:
           • in customer's price list → prepared price + priceListItemId
           • else                     → wholesale / "price on request" + productId
                                         ▼
            ┌─ all lines priced → may "Place Order"  ─► ORDER (to fulfil)
            └─ any line unpriced → "Request Quote"   ─► QUOTE → admin prices → accept → ORDER
                                         ▼
                       ONE admin worklist: /admin/sales
                                         ▼
                     "Entered into inventory" → archived
```

### Backend
1. **Unify line pricing** — replace the strict `buildPricedLines` with a resolver that, per line, tries the price list first and **falls back** to the catalog product (`wholesalePrice`, or `null` = *price on request*) instead of throwing. Carries `priceListItemId` when matched, `productId` otherwise.
2. **One submission backend** — point the old `POST /api/quotes` at the unified resolver (keep the URL for back-compat, or 301 the frontend to a single new endpoint). Result: a logged-in customer's main-catalog quote now reflects **their** price when the product is in their list, and lands in the pipeline identically to portal quotes.
3. **Order guard** — a firm order requires every line priced. If any line is *price on request*, the endpoint returns "these need a quote first" (or the UI only offers "Request Quote"). Quote→accept→order (B1) already handles the rest.

### Customer frontend
4. **One basket** (merge `useQuoteBasket` + `usePortalBasket`), able to hold both line types; "Place Order" disabled when any line is unpriced (tooltip: "Request a quote — we'll price these for you").
5. **One "My Orders & Quotes" area** — collapse `/my-quotes` + `/portal/quotes` into a single quotes list; keep `/portal/orders` as the orders list; shared detail/accept page stays `/my-quotes/:id`.
6. **Two catalogs stay** — main `/products` (no prices) and `/portal` (customer prices). Only the basket/submission/history unify.

### Admin frontend
7. **Single nav line** — remove **Quotes** and **Orders** from the sidebar; **Sales (pipeline)** becomes the one entry. Keep `/admin/quotes` & `/admin/orders` **routes** alive (unlinked) so Sales' "Open" detail actions (quote versioning, respond, accept) keep working; migrate those actions into Sales later if desired.

---

## Phasing (each shippable, verified, reversible)
- **D1 — Backend unify** (resolver + old route delegates + order guard). Highest value; fixes concern #1 directly. End-to-end test as before.
- **D2 — Customer one-basket + one-history.** UX consolidation.
- **D3 — Admin single nav line.** Small; mostly removing two sidebar entries + redirects.

Recommend building **D1 first** (it resolves the actual reported bug), then D2, then D3.

## Risks / notes
- Shared Neon prod DB — schema only via idempotent SQL in `server/db.ts`; no `db:push`. No new columns needed for this (both `productId` and `priceListItemId` already exist on items).
- Existing old-route quotes (productId-only) remain valid and keep working.
- Don't merge the tables. Don't show main-catalog prices on the public site (keeps the two levels distinct, per owner).

## D2 design (one merged basket) — proposed
Today there are two baskets: `useQuoteBasket` (catalog products, localStorage `…_quote_basket`, checkout `/quote`) and `usePortalBasket` (price-list items, localStorage `…_portal_basket`, checkout `/portal/basket`). Plan:
- **One `useBasket` context**, one localStorage key, holding a discriminated line:
  `{ key, kind: 'catalog'|'portal', refId, name, sku?, imageUrl?, price: number|null, quantity }`.
  Catalog add-sites pass `kind:'catalog', refId=productId`; portal add-sites pass `kind:'portal', refId=priceListItemId`.
- **One checkout** that submits `items.map(l => l.kind==='portal' ? {itemId:l.refId,qty} : {productId:l.refId,qty})` to the unified backend (already built in D1). "Place Order" enabled only when every line `price != null`; otherwise "Request Quote" only.
- **One history** ("My Orders & Quotes"): collapse `/my-quotes` + `/portal/quotes` into one quotes list; keep `/portal/orders`; shared detail/accept stays `/my-quotes/:id`.
- Touch points: `products.tsx`, `product-detail.tsx`, `portal/catalogue.tsx`, `portal/basket.tsx` (→ generic basket page), `quote.tsx`, `App.tsx` (provider + routes), header basket indicator(s).
- **UX decisions LOCKED (owner, 2026-06-26):**
  - (a) **One shared basket everywhere** — a logged-in customer has a single basket shared by the public site + portal (one icon, one checkout). The two *catalogues* still stay separate (public = no prices, portal = customer prices); only the basket/checkout unifies.
  - (b) **One `/basket` route** used by both surfaces; `/quote` and `/portal/basket` redirect to it.
- **Status:** not started — owner is redeploying to test D1+D3 on the live site first, then D2 builds.

## Locked decisions (owner, 2026-06-26)
1. **Unpriced main items are QUOTE-ONLY.** A firm order requires every line priced; any "price on request" line forces "Request Quote".
2. **One merged basket** — combine the two baskets into a single basket holding both main and portal items, one checkout, one history.
3. **Hide old admin pages from nav, keep reachable** — remove "Quotes" + "Orders" sidebar lines; keep `/admin/quotes` & `/admin/orders` routes alive as detail/action screens that Sales "Open" links to.

## Build status
- **D1 — Backend unify: ✅ DONE (2026-06-26).** Unified `buildPricedLines` resolver (routes.ts) now serves both catalogues: portal item by `itemId`, main product by `productId` matched to the customer's price via **EAN** (`pricingV2.getCustomerItemByEan`), else **price-on-request** (null). Old `POST /api/quotes` repointed through it (main-catalog quotes now use the customer's own price, carry `priceListItemId`). Orders blocked when any line is price-on-request (`allPriced` guard on `POST /api/portal/orders`, returns `needsQuote:true`). **Verified by a 12-assertion end-to-end test** (EAN-matched customer price beats wholesale; price-on-request; order guard; portal item; mixed basket). Type-checks + builds clean. No schema changes (both id columns already existed).
- **D2 — One merged basket + one history: ✅ DONE (2026-06-26).** New unified store `client/src/lib/basket.tsx` (`BasketProvider`/`useBasket`, single localStorage key `pharma_oasis_basket`, discriminated `catalog|portal` lines). The old `useQuoteBasket`/`usePortalBasket` are now thin **adapters** over it (re-exported from `lib/quote-basket.tsx` / `lib/portal-basket.tsx`), so every add-to-basket call-site and both basket indicators work unchanged and now show a **shared** count. New single checkout `client/src/pages/basket.tsx` at **`/basket`** (`PublicLayout`, auth-gated): "Place Order" only when every line is priced, else "Request Quote" (matches the D1 server guard); submits the unified `[{itemId}|{productId}]` payload. `/quote` and `/portal/basket` **redirect** to `/basket`; `/portal/quotes` redirects to `/my-quotes` (dedupes the quote history); portal nav "My Quotes" → `/my-quotes`. Orphaned pages removed (`pages/quote.tsx`, `pages/portal/basket.tsx`, `pages/portal/quotes.tsx`). Build + type-check clean; all routes serve 200; submission payloads are the same ones D1's mixed-basket test already verified.
  - _History note:_ quotes now live in ONE screen (`/my-quotes`) and orders in ONE (`/portal/orders`) — duplicates removed. A single combined tabbed "My Orders & Quotes" page was **not** built (optional polish).
- _(superseded) D2 design notes:_
- **D3 — Single admin nav line: ✅ DONE (2026-06-26).** Removed "Quotes" + "Orders" from the admin sidebar (`admin-layout.tsx`); "Sales (pipeline)" is the single line. `/admin/quotes` & `/admin/orders` routes stay alive and are reached via Sales' "Open" buttons (quote versioning / respond / accept actions preserved). Build clean.
