# Customer Portal & Per-Customer Pricing — Design Model **v2 (corrected)**

> Status: **DESIGN — supersedes `CUSTOMER_PORTAL_DESIGN.md`.** v1 was built but the
> operating model was wrong. This v2 is the agreed corrected model to build from.
>
> **What changed from v1 (and why it was off):**
> - v1 reused the **catalogue brands**. → v2 has a **standalone Brands section** (and
>   standalone **Categories**) for the pricing side, independent of the public catalogue.
> - v1 had **no way to prepare and save a price list** — prices were calculated on-the-fly
>   from abstract margin "rules". → v2 has a real **Price List Builder**: open a brand,
>   auto-fill its products, set margins / fixed prices, **save under a name**.
> - v1 layered rules globally (overall/brand/category/product) with **one global list per
>   customer**. → v2 ties every price list to **one brand**, and a customer gets **one list
>   per brand** (enforced — never two lists for the same brand).

---

## 1. Goal

A **customer portal** (top "Customer Login") where each logged-in customer sees **their own
prices** per brand, browses available products, and can **place an order** or **request a
quote**. Behind it, the admin **uploads a base cost per brand** and **prepares named price
lists** off that cost, then **allocates each list to the customers allowed to see it**.

---

## 2. The operating model (the flow that must work)

```
Brands section            → admin adds all pricing brands (standalone)
Categories section        → admin adds all categories (standalone)
        ↓
Upload BASE COST per brand → one base cost per brand (EAN, desc, case size, cost, qty)
        ↓
PRICE LIST BUILDER         → pick a brand; it auto-fills EVERY product from that brand's
                             base cost. Set a default margin %, then tweak individual
                             products (different margin, fixed price, or cost + amount).
                             Live price preview. SAVE under a name.
        ↓
(many named lists per brand: "Brand X – Wholesale", "Brand X – Retail", ...)
        ↓
ASSIGN list → customers     → simple picker: tick the customers (D, T, R, E) or "all".
                             HARD RULE: one list per customer PER BRAND. The system blocks
                             assigning a second list for the same brand to a customer.
        ↓
Customer logs in            → sees, per brand, only the price from their nominated list.
                             Never sees cost, margin, or supplier.
```

---

## 3. Standalone Brands & Categories (new)

These are **separate from the existing public-catalogue brands/categories.** The pricing side
owns its own brand and category lists so it can be managed cleanly and independently.

### Table: `pricing_brands`
| Field | Purpose |
|------|---------|
| id | — |
| name | brand name (unique) |
| slug | url/key |
| logoUrl | optional, for portal display |
| isActive | hide without deleting |
| sortOrder | manual ordering |
| createdAt / updatedAt | — |

### Table: `pricing_categories`
| Field | Purpose |
|------|---------|
| id | — |
| name | category name (unique) |
| slug | url/key |
| isActive | — |
| sortOrder | — |
| createdAt / updatedAt | — |

> Admin gets two simple management screens: **Brands** and **Categories** (add / edit /
> activate / reorder). Products on the pricing side reference these, not the catalogue ones.

---

## 4. Base cost per brand (one per brand)

Each brand has **exactly one active base cost** — the latest published upload. This is the
single source the builder reads product lines and costs from. (Internal only — never shown
to customers.)

### Table: `cost_uploads` (batch header, per brand)
| Field | Purpose |
|------|---------|
| id | — |
| brandId | FK → `pricing_brands` — one base cost per brand |
| supplierName | optional batch default |
| validFrom / validUntil | validity window — internal only |
| comment, fileName, uploadedBy | metadata + audit |
| uploadedAt | shows how old the cost is |
| status | draft → published → superseded → archived |

### Table: `cost_upload_rows` (the product lines)
| Field | Purpose |
|------|---------|
| id | — |
| uploadId | FK → batch |
| categoryId | FK → `pricing_categories` (matched/assigned from the file's `Category:` blocks) |
| ean | barcode — match key + audit |
| description | product name |
| caseSize | units per case |
| costPrice | supplier cost £ (the base the builder marks up) |
| supplierQty | stock → availability (>0 in stock, 0 out, blank on-request) |
| supplierName / validUntil / comment | optional per-row overrides |

> The **base cost rows ARE the brand's product set** for pricing. No separate product
> catalogue is required on the pricing side — a brand's products = its base-cost lines.
> Excel format, downloadable template, and import preview/guardrails carry over from v1 (§7).

---

## 5. Price List Builder (the core new capability)

A **price list belongs to one brand** and is a **saved, named** set of prepared prices.

### How preparing a list works
1. Admin clicks **"New price list"**, picks a **brand**, gives it a **name**.
2. The builder **auto-fills one line per product** from that brand's base cost (every EAN).
3. Admin sets a **default margin %** → applied to all lines at once.
4. Admin **tweaks individual products** as needed, choosing a method per line:
   - **Margin %** on cost (line default = the list default),
   - **Fixed price** (negotiated flat £, overrides margin),
   - **Cost + amount** (cost plus a flat £ uplift) — optional convenience method.
5. **Live preview**: each line shows the resulting customer price as you edit; a summary
   shows lowest/highest margin and any below-cost warnings.
6. **Save** → the list and all its prepared lines are stored under the name.

### Table: `price_lists`
| Field | Purpose |
|------|---------|
| id | — |
| brandId | FK → `pricing_brands` — **every list is scoped to one brand** |
| name | "Applied Nutrition – Wholesale", etc. |
| defaultMarginPercent | the list-wide default applied on build |
| baseCostUploadId | FK → which base cost this list was prepared from (audit/refresh) |
| status | draft / published |
| isActive | — |
| notes | internal |
| createdAt / updatedAt | — |

### Table: `price_list_items` (one prepared line per product)
| Field | Purpose |
|------|---------|
| id | — |
| priceListId | FK |
| costRowId | FK → `cost_upload_rows` (the source product/cost line) |
| ean | denormalised for stability + display |
| method | `margin` / `fixed` / `cost_plus` |
| marginPercent | used when method = margin |
| fixedPrice | used when method = fixed |
| plusAmount | used when method = cost_plus |
| preparedPrice | the computed/stored customer price (frozen on save) |
| isActive | — |

> **Prepared, not live.** `preparedPrice` is computed and stored at save time, so a list is a
> real saved artifact — not recomputed on every view. When the brand's base cost is
> re-uploaded, the admin gets a prompt to **re-prepare / refresh** affected lists (margins
> re-apply automatically, fixed prices are kept and flagged for review).

### Worked example — brand "Applied Nutrition", list "Wholesale" (default +20%)
| Product | Base cost | Line method | Customer price |
|---------|-----------|-------------|----------------|
| Whey 1kg | £8.40 | margin +20% (default) | £10.08 |
| Creatine 500g | £6.00 | margin +15% (override) | £6.90 |
| BCAA 400g | £5.00 | fixed £7.50 | £7.50 |
| Pre-Workout | £9.00 | cost + £3.00 | £12.00 |

---

## 6. Assigning lists to customers (one per brand — enforced)

A saved list is allocated to the customers allowed to see it.

### Table: `customer_price_lists` (assignment)
| Field | Purpose |
|------|---------|
| id | — |
| customerId | FK → users |
| priceListId | FK → `price_lists` |
| brandId | denormalised from the list — **used for the uniqueness guard** |
| assignedAt / assignedBy | audit |

- **Unique constraint on `(customerId, brandId)`** → a customer can have **at most one list
  per brand**. Trying to assign a second list for the same brand is **blocked** with a clear
  message ("Customer D already has 'Wholesale' for Applied Nutrition — replace it?").
- **Assignment UI:** open a price list → **"Assign to customers"** → a checkbox list of
  customers, plus an **"All customers"** toggle. Ticking a customer who already has another
  list for this brand shows the replace prompt rather than silently double-assigning.
- A customer with **no list for a brand** simply **doesn't see that brand** in the portal
  (or sees "price on request" — chosen behaviour, configurable).

> Replaces v1's single global `users.priceListId`. Pricing is now per brand, so a customer
> naturally holds several assignments — one per brand they're allowed to buy.

---

## 7. Customer portal (front end)

- Public site unchanged; add a top **"Customer Login"** button.
- Logged-in customer sees, **per brand they're nominated for**, the products and **their
  prepared price** from the assigned list.
- **Availability** from supplier qty: >0 in stock (low = limited), 0 out of stock, blank on
  request.
- **Search / filter (brand, category, availability, price) / sort**, grid-or-list, sticky
  basket → **Place Order** or **Request Quote / Availability**.
- **Download price list** (Excel / PDF) scoped to chosen brands/categories — always the
  customer's prepared prices, never cost or margin.
- Customers **never** see cost, margin, supplier, or validity.

### Orders & quotes (snapshots)
- `orders` / `order_items`, `quotes` / `quote_items` snapshot the **prepared price** (and
  internal cost/margin for audit) at submission — frozen, never rewritten by later changes.
- **Email**: admin notified on every new quote/order; customer gets confirmation and an
  update when admin responds (in-portal thread **and** email).

---

## 8. Mistake-proofing (carried from v1, still apply)

Upload dry-run preview; suspicious-value warnings (cost=0, cost>RRP, jump beyond a Settings
threshold, duplicate/unmatched EANs); below-cost / negative-margin blocking in the builder;
draft vs published for both costs and lists; no silent expiry (keep last price + alert);
**one list per customer per brand** (this doc, §6); strict cost/price role separation
(customer APIs return prepared price only); full audit trail; frozen order/quote snapshots.

---

## 9. Table summary (v2)

**New / standalone:** `pricing_brands`, `pricing_categories`.
**Reworked:** `cost_uploads` & `cost_upload_rows` (now FK to pricing brands/categories);
`price_lists` (now **brand-scoped**, with `defaultMarginPercent` + `baseCostUploadId`);
**`price_list_items`** (NEW — the saved prepared prices, replacing on-the-fly
`price_list_rules`); **`customer_price_lists`** (NEW assignment table with the
`(customerId, brandId)` uniqueness guard, replacing global `users.priceListId`).
**Kept:** `orders`, `order_items`, `quotes`, `quote_items` (snapshots).
**Retired:** `price_list_rules` (layered on-the-fly rules), `users.priceListId` (single
global list).
