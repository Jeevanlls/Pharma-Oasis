// ============================================================
// Customer pricing v2 — standalone brands/categories + a real
// Price List BUILDER (prepare prices off a brand's base cost and save them),
// per-brand customer assignment (one list per customer per brand), and the
// portal resolver that reads prepared prices.
//
// Supersedes the on-the-fly price_list_rules engine in pricing.ts.
// ============================================================
import { db } from "./db";
import {
  pricingBrands,
  pricingCategories,
  priceLists,
  priceListItems,
  customerPriceLists,
  costUploads,
  costUploadRows,
  users,
} from "@shared/schema";
import { eq, and, desc, asc, ne, inArray, sql } from "drizzle-orm";
import type {
  PricingBrand,
  InsertPricingBrand,
  PricingCategory,
  InsertPricingCategory,
  PriceList,
  PriceListItem,
} from "@shared/schema";

const toStr = (n: number | null | undefined): string | null =>
  n === null || n === undefined || (typeof n === "number" && isNaN(n)) ? null : String(n);
const num = (v: string | number | null | undefined): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);
const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const slugify = (s: string): string =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export type PriceMethod = "margin" | "fixed" | "cost_plus";

/** The core price-preparation maths. */
export function computePrepared(
  method: PriceMethod,
  cost: number | null,
  marginPercent: number | null,
  fixedPrice: number | null,
  plusAmount: number | null,
): number | null {
  if (method === "fixed") return fixedPrice !== null ? round2(fixedPrice) : null;
  if (method === "cost_plus")
    return cost !== null && plusAmount !== null ? round2(cost + plusAmount) : null;
  // margin (default)
  if (cost !== null && marginPercent !== null) return round2(cost * (1 + marginPercent / 100));
  return null;
}

// ---------------------------------------------------------------
// PRICING BRANDS (standalone)
// ---------------------------------------------------------------
export async function listPricingBrands(): Promise<PricingBrand[]> {
  return db.select().from(pricingBrands).orderBy(asc(pricingBrands.sortOrder), asc(pricingBrands.name));
}

export async function createPricingBrand(data: Partial<InsertPricingBrand>): Promise<PricingBrand> {
  const [b] = await db
    .insert(pricingBrands)
    .values({
      name: (data.name ?? "").trim(),
      slug: data.slug || slugify(data.name ?? ""),
      logoUrl: data.logoUrl ?? null,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
      notes: data.notes ?? null,
    })
    .returning();
  return b;
}

export async function updatePricingBrand(id: number, data: Partial<InsertPricingBrand>): Promise<PricingBrand> {
  const patch: any = { updatedAt: new Date() };
  if (data.name !== undefined) {
    patch.name = data.name.trim();
    patch.slug = data.slug || slugify(data.name);
  }
  if (data.logoUrl !== undefined) patch.logoUrl = data.logoUrl;
  if (data.isActive !== undefined) patch.isActive = data.isActive;
  if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
  if (data.notes !== undefined) patch.notes = data.notes;
  const [b] = await db.update(pricingBrands).set(patch).where(eq(pricingBrands.id, id)).returning();
  return b;
}

export async function deletePricingBrand(id: number): Promise<void> {
  await db.delete(pricingBrands).where(eq(pricingBrands.id, id));
}

// ---------------------------------------------------------------
// PRICING CATEGORIES (standalone)
// ---------------------------------------------------------------
export async function listPricingCategories(): Promise<PricingCategory[]> {
  return db.select().from(pricingCategories).orderBy(asc(pricingCategories.sortOrder), asc(pricingCategories.name));
}

export async function createPricingCategory(data: Partial<InsertPricingCategory>): Promise<PricingCategory> {
  const [c] = await db
    .insert(pricingCategories)
    .values({
      name: (data.name ?? "").trim(),
      slug: data.slug || slugify(data.name ?? ""),
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
      notes: data.notes ?? null,
    })
    .returning();
  return c;
}

export async function updatePricingCategory(id: number, data: Partial<InsertPricingCategory>): Promise<PricingCategory> {
  const patch: any = { updatedAt: new Date() };
  if (data.name !== undefined) {
    patch.name = data.name.trim();
    patch.slug = data.slug || slugify(data.name);
  }
  if (data.isActive !== undefined) patch.isActive = data.isActive;
  if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
  if (data.notes !== undefined) patch.notes = data.notes;
  const [c] = await db.update(pricingCategories).set(patch).where(eq(pricingCategories.id, id)).returning();
  return c;
}

export async function deletePricingCategory(id: number): Promise<void> {
  await db.delete(pricingCategories).where(eq(pricingCategories.id, id));
}

/** Resolve (creating if needed) a pricing category id from a free-text name. */
export async function ensurePricingCategory(name: string | null | undefined): Promise<number | null> {
  const clean = (name ?? "").trim();
  if (!clean) return null;
  const [existing] = await db
    .select()
    .from(pricingCategories)
    .where(eq(pricingCategories.name, clean))
    .limit(1);
  if (existing) return existing.id;
  const created = await createPricingCategory({ name: clean });
  return created.id;
}

// ---------------------------------------------------------------
// BASE COST for a brand (latest published cost upload + its rows)
// ---------------------------------------------------------------
export async function getBaseCostForBrand(
  brandId: number,
): Promise<{ uploadId: number; rows: typeof costUploadRows.$inferSelect[] } | null> {
  const [upload] = await db
    .select()
    .from(costUploads)
    .where(and(eq(costUploads.brandId, brandId), eq(costUploads.status, "published")))
    .orderBy(desc(costUploads.publishedAt))
    .limit(1);
  if (!upload) return null;
  const rows = await db.select().from(costUploadRows).where(eq(costUploadRows.uploadId, upload.id));
  return { uploadId: upload.id, rows };
}

// ---------------------------------------------------------------
// PRICE LIST BUILDER
// ---------------------------------------------------------------
export interface PriceListSummary extends PriceList {
  brandName: string | null;
  itemCount: number;
  customerCount: number;
}

export async function listPriceListsV2(brandId?: number): Promise<PriceListSummary[]> {
  const rows = await db
    .select({ list: priceLists, brandName: pricingBrands.name })
    .from(priceLists)
    .leftJoin(pricingBrands, eq(priceLists.brandId, pricingBrands.id))
    .where(brandId ? eq(priceLists.brandId, brandId) : sql`true`)
    .orderBy(asc(pricingBrands.name), asc(priceLists.name));

  const out: PriceListSummary[] = [];
  for (const r of rows) {
    const [{ count: itemCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(priceListItems)
      .where(eq(priceListItems.priceListId, r.list.id));
    const [{ count: customerCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customerPriceLists)
      .where(eq(customerPriceLists.priceListId, r.list.id));
    out.push({ ...r.list, brandName: r.brandName, itemCount, customerCount });
  }
  return out;
}

export async function getPriceListFull(
  id: number,
): Promise<{ list: PriceList; brandName: string | null; items: PriceListItem[] } | null> {
  const [list] = await db.select().from(priceLists).where(eq(priceLists.id, id));
  if (!list) return null;
  const [brand] = list.brandId
    ? await db.select().from(pricingBrands).where(eq(pricingBrands.id, list.brandId))
    : [null as any];
  const items = await db
    .select()
    .from(priceListItems)
    .where(eq(priceListItems.priceListId, id))
    .orderBy(asc(priceListItems.description));
  return { list, brandName: brand?.name ?? null, items };
}

/** Create a new draft list for a brand and AUTO-FILL one item per product from
 *  that brand's base cost, at the given default margin %. */
export async function buildPriceList(input: {
  brandId: number;
  name: string;
  defaultMarginPercent: number;
}): Promise<{ list: PriceList; itemCount: number }> {
  const base = await getBaseCostForBrand(input.brandId);
  const margin = input.defaultMarginPercent;

  const [list] = await db
    .insert(priceLists)
    .values({
      name: input.name.trim(),
      brandId: input.brandId,
      baseCostUploadId: base?.uploadId ?? null,
      defaultMarginPercent: toStr(margin),
      status: "draft",
      type: "customer",
      isActive: true,
    })
    .returning();

  let itemCount = 0;
  if (base && base.rows.length) {
    const values = base.rows.map((row) => {
      const cost = num(row.costPrice);
      return {
        priceListId: list.id,
        costRowId: row.id,
        ean: row.ean,
        description: row.description,
        pricingCategoryId: row.pricingCategoryId ?? null,
        caseSize: row.caseSize,
        costPrice: row.costPrice,
        method: "margin" as const,
        marginPercent: toStr(margin),
        fixedPrice: null,
        plusAmount: null,
        preparedPrice: toStr(computePrepared("margin", cost, margin, null, null)),
        supplierQty: row.supplierQty ?? null,
        isActive: true,
      };
    });
    await db.insert(priceListItems).values(values);
    itemCount = values.length;
  }
  return { list, itemCount };
}

export async function updatePriceListMeta(
  id: number,
  data: { name?: string; defaultMarginPercent?: number | null; status?: string; notes?: string },
): Promise<PriceList> {
  const patch: any = { updatedAt: new Date() };
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.defaultMarginPercent !== undefined) patch.defaultMarginPercent = toStr(data.defaultMarginPercent);
  if (data.status !== undefined) patch.status = data.status;
  if (data.notes !== undefined) patch.notes = data.notes;
  const [list] = await db.update(priceLists).set(patch).where(eq(priceLists.id, id)).returning();
  return list;
}

/** Apply a default margin to every margin-method item in the list (fixed/cost_plus kept). */
export async function applyDefaultMargin(id: number, margin: number): Promise<number> {
  const items = await db.select().from(priceListItems).where(eq(priceListItems.priceListId, id));
  let n = 0;
  for (const it of items) {
    if (it.method !== "margin") continue;
    const cost = num(it.costPrice);
    await db
      .update(priceListItems)
      .set({
        marginPercent: toStr(margin),
        preparedPrice: toStr(computePrepared("margin", cost, margin, null, null)),
        updatedAt: new Date(),
      })
      .where(eq(priceListItems.id, it.id));
    n++;
  }
  await db.update(priceLists).set({ defaultMarginPercent: toStr(margin), updatedAt: new Date() }).where(eq(priceLists.id, id));
  return n;
}

export interface ItemPatch {
  id: number;
  method?: PriceMethod;
  marginPercent?: number | null;
  fixedPrice?: number | null;
  plusAmount?: number | null;
}

/** Update one or many item overrides, recomputing each prepared price. */
export async function updatePriceListItems(listId: number, patches: ItemPatch[]): Promise<number> {
  let n = 0;
  for (const p of patches) {
    const [it] = await db.select().from(priceListItems).where(eq(priceListItems.id, p.id));
    if (!it || it.priceListId !== listId) continue;
    const method = (p.method ?? (it.method as PriceMethod)) as PriceMethod;
    const cost = num(it.costPrice);
    const margin = p.marginPercent !== undefined ? p.marginPercent : num(it.marginPercent);
    const fixed = p.fixedPrice !== undefined ? p.fixedPrice : num(it.fixedPrice);
    const plus = p.plusAmount !== undefined ? p.plusAmount : num(it.plusAmount);
    await db
      .update(priceListItems)
      .set({
        method,
        marginPercent: toStr(margin),
        fixedPrice: toStr(fixed),
        plusAmount: toStr(plus),
        preparedPrice: toStr(computePrepared(method, cost, margin, fixed, plus)),
        updatedAt: new Date(),
      })
      .where(eq(priceListItems.id, p.id));
    n++;
  }
  return n;
}

export async function deletePriceListV2(id: number): Promise<void> {
  await db.delete(priceListItems).where(eq(priceListItems.priceListId, id));
  await db.delete(customerPriceLists).where(eq(customerPriceLists.priceListId, id));
  await db.delete(priceLists).where(eq(priceLists.id, id));
}

/** Re-pull base cost (by EAN) into the list. Margin/cost_plus items recompute;
 *  fixed-price items keep their price but are returned as "needs review". */
export async function refreshFromBaseCost(id: number): Promise<{ updated: number; fixedToReview: number }> {
  const [list] = await db.select().from(priceLists).where(eq(priceLists.id, id));
  if (!list || !list.brandId) return { updated: 0, fixedToReview: 0 };
  const base = await getBaseCostForBrand(list.brandId);
  if (!base) return { updated: 0, fixedToReview: 0 };
  const costByEan = new Map<string, number | null>();
  for (const r of base.rows) if (r.ean) costByEan.set(r.ean, num(r.costPrice));

  const items = await db.select().from(priceListItems).where(eq(priceListItems.priceListId, id));
  let updated = 0;
  let fixedToReview = 0;
  for (const it of items) {
    if (!it.ean || !costByEan.has(it.ean)) continue;
    const cost = costByEan.get(it.ean) ?? null;
    if (it.method === "fixed") {
      fixedToReview++;
      await db.update(priceListItems).set({ costPrice: toStr(cost), updatedAt: new Date() }).where(eq(priceListItems.id, it.id));
      continue;
    }
    await db
      .update(priceListItems)
      .set({
        costPrice: toStr(cost),
        preparedPrice: toStr(
          computePrepared(it.method as PriceMethod, cost, num(it.marginPercent), num(it.fixedPrice), num(it.plusAmount)),
        ),
        updatedAt: new Date(),
      })
      .where(eq(priceListItems.id, it.id));
    updated++;
  }
  await db.update(priceLists).set({ baseCostUploadId: base.uploadId, updatedAt: new Date() }).where(eq(priceLists.id, id));
  return { updated, fixedToReview };
}

// ---------------------------------------------------------------
// COST RECONCILIATION — review a new base cost against the saved list
// before applying. Buckets: changed / unchanged / new / missing.
// ---------------------------------------------------------------
export const BIG_CHANGE_PCT = 25; // |change%| above this is flagged "are you sure?"

export interface ReconcileChanged {
  itemId: number;
  ean: string | null;
  description: string | null;
  method: string;
  oldCost: number | null;
  newCost: number | null;
  changePercent: number | null;
  big: boolean; // exceeds BIG_CHANGE_PCT — needs explicit confirmation
}
export interface ReconcileNew {
  ean: string | null;
  description: string | null;
  cost: number | null;
  costRowId: number;
  pricingCategoryId: number | null;
  caseSize: string | null;
  supplierQty: number | null;
}
export interface ReconcileMissing {
  itemId: number;
  ean: string | null;
  description: string | null;
  oldCost: number | null;
  preparedPrice: number | null;
}
export interface ReconcilePreview {
  hasBaseCost: boolean;
  defaultMarginPercent: number | null;
  changed: ReconcileChanged[];
  unchangedCount: number;
  newProducts: ReconcileNew[];
  missing: ReconcileMissing[];
}

const pctChange = (oldC: number | null, newC: number | null): number | null =>
  oldC === null || newC === null || oldC === 0 ? null : round2(((newC - oldC) / oldC) * 100);

/** Compare a list's saved items against the brand's latest published base cost. */
export async function reconcilePreview(listId: number): Promise<ReconcilePreview> {
  const [list] = await db.select().from(priceLists).where(eq(priceLists.id, listId));
  const empty: ReconcilePreview = {
    hasBaseCost: false,
    defaultMarginPercent: list ? num(list.defaultMarginPercent) : null,
    changed: [],
    unchangedCount: 0,
    newProducts: [],
    missing: [],
  };
  if (!list || !list.brandId) return empty;
  const base = await getBaseCostForBrand(list.brandId);
  if (!base) return empty;

  const items = await db.select().from(priceListItems).where(eq(priceListItems.priceListId, listId));
  const baseByEan = new Map<string, typeof base.rows[number]>();
  for (const r of base.rows) if (r.ean) baseByEan.set(r.ean, r);
  const itemEans = new Set(items.map((it) => it.ean).filter(Boolean) as string[]);

  const changed: ReconcileChanged[] = [];
  const missing: ReconcileMissing[] = [];
  let unchangedCount = 0;

  for (const it of items) {
    const baseRow = it.ean ? baseByEan.get(it.ean) : undefined;
    if (!baseRow) {
      missing.push({
        itemId: it.id,
        ean: it.ean,
        description: it.description,
        oldCost: num(it.costPrice),
        preparedPrice: num(it.preparedPrice),
      });
      continue;
    }
    const oldCost = num(it.costPrice);
    const newCost = num(baseRow.costPrice);
    if (oldCost === newCost) {
      unchangedCount++;
      continue;
    }
    const cp = pctChange(oldCost, newCost);
    changed.push({
      itemId: it.id,
      ean: it.ean,
      description: it.description,
      method: it.method,
      oldCost,
      newCost,
      changePercent: cp,
      big: cp !== null && Math.abs(cp) > BIG_CHANGE_PCT,
    });
  }

  const newProducts: ReconcileNew[] = base.rows
    .filter((r) => r.ean && !itemEans.has(r.ean))
    .map((r) => ({
      ean: r.ean,
      description: r.description,
      cost: num(r.costPrice),
      costRowId: r.id,
      pricingCategoryId: r.pricingCategoryId ?? null,
      caseSize: r.caseSize,
      supplierQty: r.supplierQty ?? null,
    }));

  return {
    hasBaseCost: true,
    defaultMarginPercent: num(list.defaultMarginPercent),
    changed,
    unchangedCount,
    newProducts,
    missing,
  };
}

export interface ReconcileDecisions {
  applyChangedItemIds: number[]; // changed lines to accept the new cost for (recompute price)
  addNewEans: string[]; // new products to add to the list
  newMarginPercent?: number | null; // margin for added products (defaults to list default)
  removeMissingItemIds: number[]; // missing lines to DELETE (others are kept at last price)
}

export interface ReconcileResult {
  costsUpdated: number;
  added: number;
  removed: number;
  keptMissing: number;
}

/** Apply the admin's reviewed decisions from reconcilePreview. */
export async function reconcileApply(listId: number, d: ReconcileDecisions): Promise<ReconcileResult> {
  const [list] = await db.select().from(priceLists).where(eq(priceLists.id, listId));
  if (!list || !list.brandId) throw new Error("Price list has no brand");
  const base = await getBaseCostForBrand(list.brandId);
  if (!base) throw new Error("No published base cost for this brand");

  const baseByEan = new Map<string, typeof base.rows[number]>();
  for (const r of base.rows) if (r.ean) baseByEan.set(r.ean, r);

  const applyChanged = new Set(d.applyChangedItemIds ?? []);
  const removeMissing = new Set(d.removeMissingItemIds ?? []);
  const addEans = new Set(d.addNewEans ?? []);
  const newMargin = d.newMarginPercent ?? num(list.defaultMarginPercent) ?? 0;

  let costsUpdated = 0;
  let added = 0;
  let removed = 0;

  // 1) Accepted cost changes — update cost + recompute (and refresh availability).
  for (const itemId of Array.from(applyChanged)) {
    const [it] = await db.select().from(priceListItems).where(eq(priceListItems.id, itemId));
    if (!it || it.priceListId !== listId || !it.ean) continue;
    const baseRow = baseByEan.get(it.ean);
    if (!baseRow) continue;
    const cost = num(baseRow.costPrice);
    await db
      .update(priceListItems)
      .set({
        costPrice: toStr(cost),
        supplierQty: baseRow.supplierQty ?? null,
        preparedPrice: toStr(
          computePrepared(it.method as PriceMethod, cost, num(it.marginPercent), num(it.fixedPrice), num(it.plusAmount)),
        ),
        updatedAt: new Date(),
      })
      .where(eq(priceListItems.id, it.id));
    costsUpdated++;
  }

  // 2) New products — add at the chosen margin.
  if (addEans.size) {
    const toAdd = base.rows.filter((r) => r.ean && addEans.has(r.ean));
    if (toAdd.length) {
      await db.insert(priceListItems).values(
        toAdd.map((row) => {
          const cost = num(row.costPrice);
          return {
            priceListId: listId,
            costRowId: row.id,
            ean: row.ean,
            description: row.description,
            pricingCategoryId: row.pricingCategoryId ?? null,
            caseSize: row.caseSize,
            costPrice: row.costPrice,
            method: "margin" as const,
            marginPercent: toStr(newMargin),
            fixedPrice: null,
            plusAmount: null,
            preparedPrice: toStr(computePrepared("margin", cost, newMargin, null, null)),
            supplierQty: row.supplierQty ?? null,
            isActive: true,
          };
        }),
      );
      added = toAdd.length;
    }
  }

  // 3) Missing — delete only the ones the admin ticked; the rest keep last price.
  if (removeMissing.size) {
    await db
      .delete(priceListItems)
      .where(and(eq(priceListItems.priceListId, listId), inArray(priceListItems.id, Array.from(removeMissing))));
    removed = removeMissing.size;
  }

  await db.update(priceLists).set({ baseCostUploadId: base.uploadId, updatedAt: new Date() }).where(eq(priceLists.id, listId));

  const preview = await reconcilePreview(listId);
  const keptMissing = preview.missing.length; // still-missing lines that were kept
  return { costsUpdated, added, removed, keptMissing };
}

// ---------------------------------------------------------------
// CUSTOMER ASSIGNMENT — one list per customer PER BRAND (enforced)
// ---------------------------------------------------------------
export class AssignmentConflict extends Error {
  constructor(public customerId: number, public existingListId: number, public brandId: number) {
    super("Customer already has a list for this brand");
    this.name = "AssignmentConflict";
  }
}

async function listBrandId(priceListId: number): Promise<number | null> {
  const [l] = await db.select({ brandId: priceLists.brandId }).from(priceLists).where(eq(priceLists.id, priceListId));
  return l?.brandId ?? null;
}

/** Assign customers to a list. If a customer already has a DIFFERENT list for
 *  the same brand: throw (replace=false) or swap it (replace=true). */
export async function assignCustomers(
  priceListId: number,
  customerIds: number[],
  opts: { replace?: boolean; assignedBy?: number | null } = {},
): Promise<{ assigned: number; conflicts: { customerId: number; existingListId: number }[] }> {
  const brandId = await listBrandId(priceListId);
  if (!brandId) throw new Error("Price list has no brand");
  const conflicts: { customerId: number; existingListId: number }[] = [];
  let assigned = 0;

  for (const customerId of customerIds) {
    const [existing] = await db
      .select()
      .from(customerPriceLists)
      .where(and(eq(customerPriceLists.customerId, customerId), eq(customerPriceLists.brandId, brandId)));

    if (existing) {
      if (existing.priceListId === priceListId) continue; // already on this list
      if (!opts.replace) {
        conflicts.push({ customerId, existingListId: existing.priceListId });
        continue;
      }
      await db
        .update(customerPriceLists)
        .set({ priceListId, assignedBy: opts.assignedBy ?? null, assignedAt: new Date() })
        .where(eq(customerPriceLists.id, existing.id));
      assigned++;
    } else {
      await db.insert(customerPriceLists).values({
        customerId,
        priceListId,
        brandId,
        assignedBy: opts.assignedBy ?? null,
      });
      assigned++;
    }
  }
  return { assigned, conflicts };
}

/** Assign the list to every active customer (replacing same-brand assignments). */
export async function assignAllCustomers(priceListId: number, assignedBy?: number | null): Promise<number> {
  const custs = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "customer"), eq(users.status, "approved")));
  const res = await assignCustomers(priceListId, custs.map((c) => c.id), { replace: true, assignedBy });
  return res.assigned;
}

export async function unassignCustomer(priceListId: number, customerId: number): Promise<void> {
  await db
    .delete(customerPriceLists)
    .where(and(eq(customerPriceLists.priceListId, priceListId), eq(customerPriceLists.customerId, customerId)));
}

/** Customers currently assigned to a list. */
export async function customersForList(priceListId: number) {
  return db
    .select({
      id: users.id,
      email: users.email,
      companyName: users.companyName,
      assignedAt: customerPriceLists.assignedAt,
    })
    .from(customerPriceLists)
    .innerJoin(users, eq(customerPriceLists.customerId, users.id))
    .where(eq(customerPriceLists.priceListId, priceListId));
}

/** All of a customer's list assignments (one per brand), with brand + list names. */
export async function assignmentsForCustomer(customerId: number) {
  return db
    .select({
      brandId: customerPriceLists.brandId,
      brandName: pricingBrands.name,
      priceListId: customerPriceLists.priceListId,
      listName: priceLists.name,
    })
    .from(customerPriceLists)
    .leftJoin(pricingBrands, eq(customerPriceLists.brandId, pricingBrands.id))
    .leftJoin(priceLists, eq(customerPriceLists.priceListId, priceLists.id))
    .where(eq(customerPriceLists.customerId, customerId));
}

// ---------------------------------------------------------------
// PORTAL — what a customer sees (prepared prices across assigned lists)
// ---------------------------------------------------------------
export async function customerListIds(customerId: number): Promise<number[]> {
  const rows = await db
    .select({ priceListId: customerPriceLists.priceListId })
    .from(customerPriceLists)
    .where(eq(customerPriceLists.customerId, customerId));
  return rows.map((r) => r.priceListId);
}

export type Availability = "in_stock" | "out_of_stock" | "on_request";
export function availabilityOf(qty: number | null | undefined): Availability {
  if (qty === null || qty === undefined) return "on_request";
  if (qty <= 0) return "out_of_stock";
  return "in_stock";
}

export interface PortalItem {
  itemId: number;
  priceListId: number;
  brandId: number | null;
  brandName: string | null;
  pricingCategoryId: number | null;
  ean: string | null;
  description: string | null;
  caseSize: string | null;
  price: number | null;
  availability: Availability;
  availableQty: number | null;
}

export interface PortalFilter {
  search?: string;
  brandId?: number;
  categoryId?: number;
  availability?: string;
  sort?: string;
}

/** Resolve the full priced catalogue a customer can see (only their nominated
 *  lists; one brand → one list, so no duplicates). Cost/margin NEVER included. */
export async function getCustomerCatalogue(customerId: number, filter: PortalFilter = {}): Promise<PortalItem[]> {
  const listIds = await customerListIds(customerId);
  if (!listIds.length) return [];

  const rows = await db
    .select({ item: priceListItems, brandId: priceLists.brandId, brandName: pricingBrands.name })
    .from(priceListItems)
    .innerJoin(priceLists, eq(priceListItems.priceListId, priceLists.id))
    .leftJoin(pricingBrands, eq(priceLists.brandId, pricingBrands.id))
    .where(and(inArray(priceListItems.priceListId, listIds), eq(priceListItems.isActive, true)));

  let items: PortalItem[] = rows.map((r) => ({
    itemId: r.item.id,
    priceListId: r.item.priceListId,
    brandId: r.brandId ?? null,
    brandName: r.brandName ?? null,
    pricingCategoryId: r.item.pricingCategoryId ?? null,
    ean: r.item.ean,
    description: r.item.description,
    caseSize: r.item.caseSize,
    price: num(r.item.preparedPrice),
    availability: availabilityOf(r.item.supplierQty),
    availableQty: r.item.supplierQty ?? null,
  }));

  const s = (filter.search ?? "").trim().toLowerCase();
  if (s)
    items = items.filter(
      (i) =>
        (i.description ?? "").toLowerCase().includes(s) ||
        (i.ean ?? "").toLowerCase().includes(s) ||
        (i.brandName ?? "").toLowerCase().includes(s),
    );
  if (filter.brandId) items = items.filter((i) => i.brandId === filter.brandId);
  if (filter.categoryId) items = items.filter((i) => i.pricingCategoryId === filter.categoryId);
  if (filter.availability) items = items.filter((i) => i.availability === filter.availability);

  switch (filter.sort) {
    case "price-asc":
      items.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
      break;
    case "price-desc":
      items.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
      break;
    case "brand":
      items.sort((a, b) => (a.brandName ?? "").localeCompare(b.brandName ?? ""));
      break;
    default:
      items.sort((a, b) => (a.description ?? "").localeCompare(b.description ?? ""));
  }
  return items;
}

/** A single prepared item a customer is allowed to see (for basket pricing). */
export async function getCustomerItem(customerId: number, itemId: number): Promise<PriceListItem | null> {
  const listIds = await customerListIds(customerId);
  if (!listIds.length) return null;
  const [it] = await db
    .select()
    .from(priceListItems)
    .where(and(eq(priceListItems.id, itemId), inArray(priceListItems.priceListId, listIds)));
  return it ?? null;
}
