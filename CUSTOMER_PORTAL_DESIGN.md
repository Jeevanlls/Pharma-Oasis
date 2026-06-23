# Customer Portal & Per-Customer Pricing — Design Model

> Status: **DESIGN ONLY — not built yet.** This is the agreed model to review and refine before any code.

## 1. Goal

Add a **separate customer portal** to the Pharma Oasis platform (reached via a top
"Customer Login" button), where each logged-in customer sees **their own prices**, the
**brands available** to them, and can **add products → place an order** or **request a
quote / availability**.

Prices are driven by: **supplier cost × (1 + margin%)** — margin on cost.

---

## 2. Core pricing concept

```
customer price = active supplier cost × (1 + their margin%)
```

Two independent halves that meet at price time:

- **COST side** — what the supplier charges us. Uploaded per brand, versioned, dated,
  can expire. (Internal only — never shown to customers.)
- **MARGIN side** — how much we add for a given customer. Layered rules per price list.

---

## 3. COST side — per-brand uploads

You upload a **cost price list for one brand at a time** (matches the prototype). Each
upload is a batch with its own metadata, so we keep full history and know how old a cost is.

### Excel format (confirmed)

```
APPLIED NUTRITION                 <- brand name (top header row)
Category: Sports & Fitness        <- category section marker
EAN | Description | Case Size | Cost Price | QTY   <- column headers
5060xxxxxxxxx | Whey Protein 1kg | 12 | 8.40 | 100 <- data rows
...
```

- **Brand** is read from the top of the file → tells us which brand this upload targets.
- **`Category:` lines** are section markers; one file may contain **multiple category
  blocks** under the same brand. (Used to confirm/route; matching is by EAN.)
- Columns:
  | Column | Meaning | Used for |
  |--------|---------|----------|
  | EAN | barcode | **matching key** → links row to a product |
  | Description | product name | display + verifying the match / new products |
  | Case Size | units per case | stored on the cost row |
  | Cost Price | supplier cost £ | the cost that margin is applied to |
  | QTY | supplier stock available | feeds "availability" (in stock vs on request) |

### Downloadable template

The admin can **download a blank template Excel anytime** (a "Download Template" button),
pre-formatted with the brand/category header rows and the exact column headers, plus one
example row — so uploads always match the importer and users can't get the layout wrong.
(See `cost-upload-template.csv` in the repo for the starting layout.)

### Table: `cost_uploads` (the batch header)
| Field | Purpose |
|------|---------|
| id | — |
| brandId | which brand this upload is for |
| supplierName | default supplier for the batch (optional) |
| validFrom / validUntil | validity window — **internal only** |
| comment | free text notes (optional) |
| fileName | original Excel name |
| uploadedBy | admin user |
| uploadedAt | **upload date — shows how old the cost is** |
| status | draft → published → superseded → archived |

### Table: `cost_upload_rows` (the lines)
| Field | Purpose |
|------|---------|
| id | — |
| uploadId | FK to batch |
| productId | matched product (by SKU/EAN) |
| ean | as written in the file (for matching + audit) |
| description | as written in the file (verify match / new products) |
| caseSize | units per case (from file) |
| costPrice | the supplier cost |
| supplierQty | supplier stock available (from QTY column) → availability |
| supplierName | **optional per-row override** (empty = use batch) |
| validUntil | **optional per-row override** (empty = use batch) |
| comment | **optional per-row note** (empty = none) |
| matchStatus | matched / unmatched / new |

> Per-row supplier/validity/comment are **optional** — leave them blank and the batch-level
> values apply. This is exactly what you asked for.

### Active cost (what pricing actually uses)
A product's **active cost** = the most recent **published, still-valid** upload row for it.
We cache it onto the product for speed and visibility:

`products` gains: `activeCostPrice`, `activeCostUploadId`, `costEffectiveDate`,
`costExpiryDate`, `costStatus` (active / expired / none).

### Expiry behaviour (your choice)
- When `validUntil` passes → cost is **expired**.
- **Customer still sees the last price** (no silent hiding).
- Admin gets an **alert**: dashboard banner + badge "Brand X costs expired — re-upload."

---

## 4. MARGIN side — price lists

A **price list** is a named set of margin rules. It can be:
- a **reusable tier** (Gold / Silver / Bronze) shared by many customers, OR
- a **private list** for one customer.

Both use the same mechanism (`type` flag distinguishes them).

### Table: `price_lists`
| Field | Purpose |
|------|---------|
| id | — |
| name | "Gold", "Customer A — Custom", etc. |
| type | `tier` (reusable) or `customer` (private) |
| isActive | — |
| notes | internal |

### Table: `price_list_rules` (the layered margins)
| Field | Purpose |
|------|---------|
| id | — |
| priceListId | FK |
| level | `overall` / `brand` / `category` / `product` |
| targetId | brandId / categoryId / productId (null for overall) |
| marginPercent | margin on cost (e.g. 20.00) |
| fixedPrice | optional — if set, **overrides** margin (negotiated flat price) |
| isActive | — |

### Resolution — most specific wins
For a (customer, product) pair, look at their price list and pick the **most specific**
matching rule:

```
1. product rule   (most specific)
2. category rule
3. brand rule
4. overall rule   (default fallback)
```

If the chosen rule has a `fixedPrice` → use it. Otherwise →
`activeCostPrice × (1 + marginPercent / 100)`.

### Customer assignment
`users` gains `priceListId`. **Every customer must have one** (default to a baseline tier
so nobody ever sees raw cost or a blank price).

---

## 5. Worked example

**Customer A** assigned to a private list:
- Overall: **+20%**
- Brand "Nurofen": **+15%**
- Category "Vitamins": **+12%**
- Product SKU-999: **fixed £4.20**

| Product | Active cost | Rule used | Customer price |
|---------|-------------|-----------|----------------|
| Nurofen tablets | £10.00 | brand +15% | £11.50 |
| Vitamin C (no brand rule) | £5.00 | category +12% | £5.60 |
| Random item | £8.00 | overall +20% | £9.60 |
| SKU-999 | £3.00 | product fixed | £4.20 |

---

## 6. Customer portal (front end)

- Public site stays as-is; add a top **"Customer Login"** button.
- Logged-in customer lands in a **separate portal area** (own layout) showing:
  - **Their** prices on every product (computed by the resolver).
  - The **brands & categories available** to them.
  - **Availability** per product, driven by the QTY column:
    - QTY > 0 → **In stock** (optionally "limited" when low).
    - QTY = 0 → **Out of stock**.
    - QTY blank → **On request** (no stock figure given).
  - A **basket** → choose **Place Order** or **Request Quote / Availability**.
- Customers **never** see cost, margin, supplier, or validity — only their final price.

### Finding products fast (user-friendly by design)
- **Search** across product name / EAN / brand, with instant results.
- **Filters**: brand, category, availability (in stock / on request), price range.
- **Sort**: name, price, brand, newest.
- Clean grid/list toggle, clear "Add to basket" with quantity, sticky basket summary.
- Designed mobile-first so it's easy on a phone or tablet, not just desktop.

### Download price lists (flexible)
Customers (and admin) can **download a price list**:
- Choose scope: **one or multiple brands and/or categories** (or everything available).
- Formats: **Excel** and **PDF** (clean, branded sheet) — extensible to CSV.
- Always reflects **that customer's prices** and current availability.
- Admin can also generate a customer's list to send manually — same engine.

### Responding to customers
Each quote/order can be **responded to two ways**:
- **In the system** — admin replies with confirmed price / availability / notes; the
  customer sees it in their portal (status + message thread).
- **Externally** — same details go out by **email**, for customers who prefer email.

### Orders (new)
| Table | Notes |
|------|-------|
| `orders` | userId, status, totals, notes, createdAt |
| `order_items` | productId, qty, **snapshot** of unitCost + unitPrice + margin at order time |

### Quotes (existing — extend)
Reuse the current quote flow; snapshot the customer's price onto quote items so the figure
is frozen at submission.

> **Snapshots matter:** once an order/quote is submitted, its prices are frozen. Later cost
> or margin changes never rewrite history.

### Email notifications
Reuses the existing email system (`server/email.ts`, Nodemailer):
- **You (admin/sales)** get an email the moment a **quote is created** or an **order is
  placed** — with customer, items, quantities, and their prices.
- **The customer** gets a confirmation, and an update when you **respond** (price /
  availability confirmed).
- Notification recipients configurable (e.g. `NOTIFICATION_EMAIL`, ordering inbox).

---

## 7. Mistake-proofing — built-in guardrails (my recommendations)

This is the part that keeps daily use smooth and stops users making costly errors:

1. **Upload preview / dry-run before publish.** After uploading an Excel, see a preview:
   matched vs unmatched SKUs, and **price change vs current** per row (▲/▼ %). Nothing
   reaches customers until you click **Publish**.
2. **Suspicious-value warnings.** Flag and require confirmation for: cost = 0, cost > RRP,
   cost jump beyond a threshold (**default ±30%, set dynamically in Settings** — raise it
   when a genuine big change is expected), duplicate SKUs in the file, unmatched SKUs.
3. **Negative-margin protection.** Block/warn if a resulting price would be **below cost**.
   Warn on 0% margin.
4. **Live price preview in the margin editor.** As you type a margin, see the resulting
   customer price on sample products — "what the customer will see."
5. **Draft vs Published** for both uploads and price lists. Work-in-progress never leaks.
6. **No silent expiry.** Expired costs keep showing the last price but raise a clear alert.
7. **Mandatory price list per customer.** No customer can exist without one (baseline tier
   default) — so customers never see cost or a blank price.
8. **Strict cost/price separation by role.** Only admin / pricing role sees cost, margin,
   supplier, validity. Customer APIs return final price only.
9. **Audit trail.** Who uploaded which batch, who changed which margin, and when.
10. **Order/quote snapshots.** Submitted figures are frozen (see §6).

---

## 8. Open / future (not for v1 unless you want)

- **One cost per product** for now. Multi-supplier-cost-per-product can be added later.
- Customer-facing "offer valid until" badges (currently validity is **internal only**).
- Tiered MOQ / case-break pricing, if ever needed.

---

## 9. Table summary

**New:** `cost_uploads`, `cost_upload_rows`, `price_lists`, `price_list_rules`,
`orders`, `order_items`.
**Changed:** `products` (+active cost cache fields), `users` (+priceListId),
`quote_items` (+price snapshot).
