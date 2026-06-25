# Customer Pricing — User Guide

_A plain-English guide to the **Customer Pricing** section of the admin panel. This is where you set the prices specific customers see, brand by brand — without ever exposing your cost or margin to them._

> **The golden rule:** customers only ever see their **final selling price**. They never see your cost, your margin, or anyone else's price list.

---

## The big picture

You build prices in a simple chain. Each step feeds the next:

```
1. Brands  →  2. Categories  →  3. Cost Uploads  →  4. Current Costs  →  5. Price Lists  →  6. Who Sees What
 (set up)      (optional)        (your costs)        (quick fixes)        (your prices)      (who gets them)
```

- **Steps 1–4** are about getting your **costs** in (what you pay).
- **Step 5** is where you turn costs into **selling prices** (what the customer pays).
- **Step 6** is where you see **which customer gets which price list**.

You don't redo every step every time. Once a brand is set up, the normal monthly job is just: **upload new costs → publish → review each price list → done** (see "The monthly routine" at the end).

---

## Step 1 — Brands
**Menu: `Customer Pricing → 1. Brands`**

Add each **brand** you sell and price. A brand is the container that holds that brand's costs and its price lists.

- Click **Add brand**, give it a name, save.
- These pricing brands are **separate** from the public catalogue brands on the main shop — keep that in mind; they don't have to match.
- Everything else hangs off a brand: you upload costs *for a brand*, and you build price lists *for a brand*.

**Do this when:** you start selling a new brand.

---

## Step 2 — Categories _(optional)_
**Menu: `Customer Pricing → 2. Categories`**

Categories are just **groups** for your products (e.g. "Vitamins", "Pain relief").

- You usually **don't** need to touch this. When you upload a cost file, any `Category:` headings in the file create these automatically.
- Come here only to rename or tidy them.

**Do this when:** you want to clean up category names. Otherwise skip it.

---

## Step 3 — Cost Uploads
**Menu: `Customer Pricing → 3. Cost Uploads`**

This is where you load **what you pay** (your supplier costs) for a brand.

1. Click **Download template** — a spreadsheet with the right columns (EAN/barcode, cost, quantity, and **Notes**).
2. Fill it in (one brand per file), then choose the **Brand**, optionally a supplier name and validity dates, and **Upload & preview**.
3. **Review before publishing** — the screen sorts every line for you:
   - 🔴 **Duplicate** — the same barcode appears twice. You **must** fix this before publishing (edit the barcode or delete the extra line — it clears as you type).
   - 🔴 **Missing info** — a blank barcode or cost. These are **skipped** when you publish (it tells you how many).
   - 🟡 **Cost changed** — the cost differs from last time. A big jump shows a **"confirm X%"** tick you must check before publishing (a safety net against typos).
   - 🔵 **New** — a barcode not seen before.
   - ⚪ **Unchanged** — same as last time.
   - If some products from last time are **missing** from the new file, an amber panel lets you **Keep** them (carried forward at the old cost) or **Remove** them.
4. Click **Publish — make these costs live**. Until you publish, nothing is live.

> **Important:** costs only flow into your price lists **after you Publish**. A draft upload does nothing.

**Do this when:** your supplier sends new cost prices.

---

## Step 4 — Current Costs _(optional)_
**Menu: `Customer Pricing → 4. Current Costs`**

A shortcut to **fix a few live costs** without re-uploading a whole file.

1. Pick a brand. You'll see its live costs and a badge saying **how long ago** they were published.
2. Search for a product, type a **new cost** (and/or a note) on just the lines you need.
3. Click **Review & apply**. A dialog shows **exactly which customer prices will change** (old → new cost, old → new price, and which customers are affected).
4. **Nothing changes until you press Confirm & apply.** Confirming republishes the costs and updates the affected customer prices automatically.

**Do this when:** one or two costs are wrong and you don't want to redo a full upload.

---

## Step 5 — Price Lists (the builder)
**Menu: `Customer Pricing → 5. Price Lists`**

This is the heart of it: turn your costs into the **selling prices** customers see.

1. Click **New Price List**, pick a brand and a name (e.g. "Gold customers"). It auto-fills **every product** from that brand's published cost, at your default margin.
2. The **working sheet** shows each product's **cost**, your pricing **method**, the live **customer price**, and the **real margin** — with a red **"below cost!"** warning if a price ever drops under cost. A counter at the top tells you if any lines are below cost.
3. Set prices, three ways (per line, or in bulk):
   - **Margin %** — price = cost + that %.
   - **Fixed £** — you type the exact selling price.
   - **Cost + £** — price = cost plus a flat amount.
   - **Set one margin % for every line** — apply a single margin across all lines at once.
   - **Bulk price (cost bands)** — different margins for different cost ranges (e.g. cheap items 25%, pricier items 10%). Hand-edited and fixed-price lines are left alone.
4. **Save** your changes.
5. **Assign** the list to customers (the **Assign** button). One customer can only be on **one list per brand** — if they're already on another list for this brand, it asks to swap.
6. **Preview as customer** shows exactly what they'll see (no cost, no margin).
7. When new costs are published later, click **Check for cost changes** — it compares this list to the brand's latest published costs and buckets every product (changed / new / missing / unchanged). Nothing is applied until you click **Apply to list**.

**Do this when:** you're setting up prices for a brand, or updating them after a cost change.

---

## Step 6 — Who Sees What
**Menu: `Customer Pricing → 6. Who Sees What`**

A read-only **overview**: for each brand, every price list and the customers on it.

- Lists with **no customers** are flagged in **amber** so gaps stand out.
- Search by customer, list, or brand.
- To actually change an assignment, go back to **Price Lists** and use **Assign**.

**Do this when:** you want to check, at a glance, who's getting which prices.

---

## Key rules to remember

- **Customers never see cost or margin** — only their final price.
- **One price list per customer, per brand.** They can be on a different list for a *different* brand, but never two lists for the *same* brand. This is enforced — it'll stop you and offer to swap.
- **Costs must be Published** before they reach a price list.
- **"Check for cost changes"** always compares against the brand's **latest published** costs (not a draft).
- **Nothing is irreversible without a confirmation** — big cost jumps, customer-price impacts, and deletions all ask first.

---

## The monthly routine (the short version)

When a supplier sends new costs:

1. **Cost Uploads** → upload the new file for the brand → review → **Publish**.
2. **Price Lists** → open each price list for that brand → **Check for cost changes** → review the changes → **Apply to list**.
3. Done — assigned customers now see the new prices.

For a quick one-off fix instead of a full upload, use **Current Costs**.

---

## Mini glossary

| Term | Plain meaning |
|---|---|
| **Cost** | What *you* pay the supplier. Never shown to customers. |
| **Margin %** | Your mark-up. 20% margin on a £10 cost = £12 selling price. |
| **Selling / customer price** | What the customer pays and sees. |
| **Publish** | Make an upload's costs live so price lists can use them. |
| **Price list** | A set of selling prices for one brand, given to chosen customers. |
| **Assign** | Attach a price list to a customer so they see those prices. |
| **Check for cost changes (reconcile)** | Compare a saved list to the latest published costs and review what moved. |
| **Cost band** | A cost range with its own margin, for bulk pricing. |

---

_Need this in the app? It's also at **Customer Pricing → How this works (guide)**._
