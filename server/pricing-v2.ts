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
  products,
} from "@shared/schema";
import { eq, and, desc, asc, ne, inArray, sql, or, isNull, lte, gte, ilike } from "drizzle-orm";
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

type CostRow = typeof costUploadRows.$inferSelect;

/** Gather base-cost rows for a CATEGORY across ALL brands: the latest published cost
 *  upload per brand, filtered to rows in this pricing category. uploadId is null
 *  because the rows come from many uploads (no single source to lock). */
export async function getBaseCostForCategory(
  categoryId: number,
): Promise<{ uploadId: number | null; rows: CostRow[] }> {
  const uploads = await db
    .select({ id: costUploads.id, brandId: costUploads.brandId })
    .from(costUploads)
    .where(eq(costUploads.status, "published"))
    .orderBy(desc(costUploads.publishedAt));
  const latestByBrand = new Map<number, number>(); // brandId -> latest published uploadId
  for (const u of uploads) if (u.brandId != null && !latestByBrand.has(u.brandId)) latestByBrand.set(u.brandId, u.id);
  const uploadIds = Array.from(latestByBrand.values());
  if (!uploadIds.length) return { uploadId: null, rows: [] };
  const rows = await db
    .select()
    .from(costUploadRows)
    .where(and(inArray(costUploadRows.uploadId, uploadIds), eq(costUploadRows.pricingCategoryId, categoryId)));
  return { uploadId: null, rows };
}

/** Base-cost rows for any list, by its scope: brand list → its brand's costs;
 *  category list → cross-brand costs in its category. Returns null if unsourceable. */
async function getBaseCostForList(
  list: { scope: string; brandId: number | null; categoryId: number | null },
): Promise<{ uploadId: number | null; rows: CostRow[] } | null> {
  if (list.scope === "category") {
    return list.categoryId != null ? getBaseCostForCategory(list.categoryId) : null;
  }
  return list.brandId != null ? getBaseCostForBrand(list.brandId) : null;
}

// ---------------------------------------------------------------
// PRICE LIST BUILDER
// ---------------------------------------------------------------
export interface PriceListSummary extends PriceList {
  brandName: string | null;
  categoryName: string | null;
  itemCount: number;
  customerCount: number;
}

export async function listPriceListsV2(
  brandId?: number,
  archived: "exclude" | "only" | "include" = "exclude",
  scope?: "brand" | "category",
): Promise<PriceListSummary[]> {
  // Promotions are managed on their own page — never list them here.
  const conds = [ne(priceLists.scope, "promotion")] as any[];
  if (brandId) conds.push(eq(priceLists.brandId, brandId));
  if (scope) conds.push(eq(priceLists.scope, scope));
  if (archived === "exclude") conds.push(ne(priceLists.status, "archived"));
  if (archived === "only") conds.push(eq(priceLists.status, "archived"));
  const rows = await db
    .select({ list: priceLists, brandName: pricingBrands.name, categoryName: pricingCategories.name })
    .from(priceLists)
    .leftJoin(pricingBrands, eq(priceLists.brandId, pricingBrands.id))
    .leftJoin(pricingCategories, eq(priceLists.categoryId, pricingCategories.id))
    .where(and(...conds))
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
    out.push({ ...r.list, brandName: r.brandName, categoryName: r.categoryName, itemCount, customerCount });
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

/** Create a CATEGORY-scoped list and auto-fill one item per product in the category
 *  (across all brands' latest published costs), at the given default margin %. */
export async function buildCategoryPriceList(input: {
  categoryId: number;
  name: string;
  defaultMarginPercent: number;
}): Promise<{ list: PriceList; itemCount: number }> {
  const base = await getBaseCostForCategory(input.categoryId);
  const margin = input.defaultMarginPercent;

  const [list] = await db
    .insert(priceLists)
    .values({
      name: input.name.trim(),
      scope: "category",
      brandId: null,
      categoryId: input.categoryId,
      baseCostUploadId: null, // category lists draw from many uploads
      defaultMarginPercent: toStr(margin),
      status: "draft",
      type: "customer",
      isActive: true,
    })
    .returning();

  let itemCount = 0;
  if (base.rows.length) {
    const values = base.rows.map((row) => {
      const cost = num(row.costPrice);
      return {
        priceListId: list.id,
        costRowId: row.id,
        ean: row.ean,
        description: row.description,
        pricingCategoryId: row.pricingCategoryId ?? input.categoryId,
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
  if (data.status !== undefined) {
    patch.status = data.status;
    if (data.status === "published") patch.publishedAt = new Date(); // stamp when it goes live
  }
  if (data.notes !== undefined) patch.notes = data.notes;
  const [list] = await db.update(priceLists).set(patch).where(eq(priceLists.id, id)).returning();
  return list;
}

/** Soft-delete: archive a list and unassign its customers (kept items so it can be restored). */
export async function archivePriceListV2(id: number): Promise<PriceList> {
  await db.delete(customerPriceLists).where(eq(customerPriceLists.priceListId, id));
  const [list] = await db
    .update(priceLists)
    .set({ status: "archived", archivedAt: new Date(), isActive: false, updatedAt: new Date() })
    .where(eq(priceLists.id, id))
    .returning();
  return list;
}

/** Bring an archived list back as a draft (customers were unassigned, so re-publish + re-assign). */
export async function restorePriceListV2(id: number): Promise<PriceList> {
  const [list] = await db
    .update(priceLists)
    .set({ status: "draft", archivedAt: null, isActive: true, updatedAt: new Date() })
    .where(eq(priceLists.id, id))
    .returning();
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
  if (!list) return { updated: 0, fixedToReview: 0 };
  const base = await getBaseCostForList(list);
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
  if (!list) return empty;
  const base = await getBaseCostForList(list);
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
  if (!list) throw new Error("Price list not found");
  const base = await getBaseCostForList(list);
  if (!base) throw new Error("No published base cost for this list");

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
// CURRENT COSTS — view & quick-edit the brand's live published costs,
// with a customer-price impact preview before applying. Lets the buyer
// change a handful of costs without re-uploading a whole file.
// ---------------------------------------------------------------
const normEan = (v: string | null | undefined): string =>
  (v ?? "").toString().replace(/\s+/g, "").replace(/\.0$/, "").trim();

export interface CurrentCostRow {
  ean: string | null;
  description: string | null;
  costPrice: number | null;
  supplierQty: number | null;
  caseSize: string | null;
  comment: string | null;
  categoryName: string | null;
}
export interface CurrentCosts {
  brandId: number;
  uploadId: number | null;
  publishedAt: string | null;
  validUntil: string | null;
  supplierName: string | null;
  rows: CurrentCostRow[];
}

/** The brand's live (latest published) costs, for the Current Costs editor. */
export async function getCurrentCosts(brandId: number): Promise<CurrentCosts> {
  const [upload] = await db
    .select()
    .from(costUploads)
    .where(and(eq(costUploads.brandId, brandId), eq(costUploads.status, "published")))
    .orderBy(desc(costUploads.publishedAt))
    .limit(1);
  if (!upload) {
    return { brandId, uploadId: null, publishedAt: null, validUntil: null, supplierName: null, rows: [] };
  }
  const rows = await db
    .select()
    .from(costUploadRows)
    .where(eq(costUploadRows.uploadId, upload.id))
    .orderBy(asc(costUploadRows.description));
  return {
    brandId,
    uploadId: upload.id,
    publishedAt: upload.publishedAt ? upload.publishedAt.toISOString() : null,
    validUntil: upload.validUntil ? upload.validUntil.toISOString() : null,
    supplierName: upload.supplierName ?? null,
    rows: rows.map((r) => ({
      ean: r.ean,
      description: r.description,
      costPrice: num(r.costPrice),
      supplierQty: r.supplierQty,
      caseSize: r.caseSize,
      comment: r.comment,
      categoryName: r.categoryName,
    })),
  };
}

export interface CostEdit { ean: string; newCost: number; comment?: string | null }

export interface CostEditImpactLine {
  listId: number;
  listName: string;
  customers: string[];
  ean: string | null;
  description: string | null;
  method: string;
  oldCost: number | null;
  newCost: number;
  changePercent: number | null;
  big: boolean;
  oldPrice: number | null;
  newPrice: number | null;
}
export interface CostEditPreview {
  costsChanged: number; // edits that genuinely move a cost
  itemsAffected: number; // customer price-list lines that will change
  listsAffected: number;
  lines: CostEditImpactLine[];
}

/** Names of customers holding a given price list (company name, else email). */
async function customerNamesForList(listId: number): Promise<string[]> {
  const rows = await db
    .select({ companyName: users.companyName, email: users.email })
    .from(customerPriceLists)
    .leftJoin(users, eq(customerPriceLists.customerId, users.id))
    .where(eq(customerPriceLists.priceListId, listId));
  return rows.map((r) => r.companyName || r.email || "—");
}

/** Keep only edits that actually change a current cost (and are valid). */
function effectiveEdits(edits: CostEdit[], curByEan: Map<string, CurrentCostRow>): Map<string, CostEdit> {
  const out = new Map<string, CostEdit>();
  for (const e of edits) {
    const key = normEan(e.ean);
    if (!key || !Number.isFinite(e.newCost) || e.newCost <= 0) continue;
    const cur = curByEan.get(key);
    const old = cur ? cur.costPrice : null;
    if (old !== null && round2(old) === round2(e.newCost) && (e.comment === undefined)) continue;
    out.set(key, e);
  }
  return out;
}

/** Preview the customer-price impact of a set of cost edits, before applying. */
export async function previewCostEdits(brandId: number, edits: CostEdit[]): Promise<CostEditPreview> {
  const current = await getCurrentCosts(brandId);
  const curByEan = new Map<string, CurrentCostRow>();
  for (const r of current.rows) if (r.ean) curByEan.set(normEan(r.ean), r);
  const editByEan = effectiveEdits(edits, curByEan);

  // Count edits that move a cost (a notes-only edit doesn't reprice anything).
  let costsChanged = 0;
  for (const [key, e] of Array.from(editByEan.entries())) {
    const old = curByEan.get(key)?.costPrice ?? null;
    if (old === null || round2(old) !== round2(e.newCost)) costsChanged++;
  }

  // The brand's own lists PLUS every category list (a category spans brands, so an edited
  // EAN may live on a category list too). Promotions use flat prices, so they're excluded.
  const lists = await db
    .select()
    .from(priceLists)
    .where(or(eq(priceLists.brandId, brandId), eq(priceLists.scope, "category")));
  const lines: CostEditImpactLine[] = [];
  const listIds = new Set<number>();
  for (const list of lists) {
    const items = await db.select().from(priceListItems).where(eq(priceListItems.priceListId, list.id));
    let custs: string[] | null = null;
    for (const it of items) {
      const key = it.ean ? normEan(it.ean) : "";
      if (!key || !editByEan.has(key)) continue;
      const newCost = editByEan.get(key)!.newCost;
      const oldCost = num(it.costPrice);
      if (oldCost !== null && round2(oldCost) === round2(newCost)) continue; // no price move
      const oldPrice = num(it.preparedPrice);
      const newPrice = computePrepared(
        it.method as PriceMethod, newCost, num(it.marginPercent), num(it.fixedPrice), num(it.plusAmount),
      );
      const cp = pctChange(oldCost, newCost);
      if (custs === null) custs = await customerNamesForList(list.id);
      lines.push({
        listId: list.id, listName: list.name, customers: custs,
        ean: it.ean, description: it.description, method: it.method,
        oldCost, newCost, changePercent: cp, big: cp !== null && Math.abs(cp) > BIG_CHANGE_PCT,
        oldPrice, newPrice,
      });
      listIds.add(list.id);
    }
  }
  return { costsChanged, itemsAffected: lines.length, listsAffected: listIds.size, lines };
}

export interface CostEditResult {
  newUploadId: number;
  costsChanged: number;
  itemsRepriced: number;
  listsAffected: number;
}

/** Apply cost edits: publish a NEW cost version for the brand (cloned from the
 *  current published costs with the edits applied, superseding the old one so the
 *  "published on" date is always truthful), then reprice every affected customer
 *  price-list line. Auto-applies — the route calls previewCostEdits first so the
 *  admin has already confirmed the customer-price impact. */
export async function applyCostEdits(
  brandId: number,
  edits: CostEdit[],
  meta: { uploadedBy?: number | null } = {},
): Promise<CostEditResult> {
  const [priorUpload] = await db
    .select()
    .from(costUploads)
    .where(and(eq(costUploads.brandId, brandId), eq(costUploads.status, "published")))
    .orderBy(desc(costUploads.publishedAt))
    .limit(1);
  if (!priorUpload) throw new Error("This brand has no published costs to edit. Upload a cost file first.");
  const priorRows = await db.select().from(costUploadRows).where(eq(costUploadRows.uploadId, priorUpload.id));

  const curByEan = new Map<string, CurrentCostRow>();
  for (const r of priorRows) if (r.ean) curByEan.set(normEan(r.ean), { ean: r.ean, description: r.description, costPrice: num(r.costPrice), supplierQty: r.supplierQty, caseSize: r.caseSize, comment: r.comment, categoryName: r.categoryName });
  const editByEan = effectiveEdits(edits, curByEan);
  if (editByEan.size === 0) throw new Error("Nothing to apply — no cost changes were provided.");

  const now = new Date();

  // New published upload, cloned from the prior one with edits applied.
  let costsChanged = 0;
  const [newUpload] = await db
    .insert(costUploads)
    .values({
      brandId,
      supplierName: priorUpload.supplierName ?? null,
      validFrom: priorUpload.validFrom ?? null,
      validUntil: priorUpload.validUntil ?? null,
      comment: `Quick cost edit (${editByEan.size} line(s))`,
      fileName: null,
      uploadedBy: meta.uploadedBy ?? null,
      status: "published",
      publishedAt: now,
      rowCount: priorRows.length,
      matchedCount: priorRows.length,
      unmatchedCount: 0,
    })
    .returning();

  await db.insert(costUploadRows).values(
    priorRows.map((r) => {
      const key = r.ean ? normEan(r.ean) : "";
      const edit = key ? editByEan.get(key) : undefined;
      const oldCost = num(r.costPrice);
      const newCost = edit ? edit.newCost : oldCost;
      const changed = !!edit && (oldCost === null || round2(oldCost) !== round2(newCost ?? 0));
      if (changed) costsChanged++;
      return {
        uploadId: newUpload.id,
        productId: r.productId,
        ean: r.ean,
        description: r.description,
        categoryName: r.categoryName,
        pricingCategoryId: r.pricingCategoryId,
        caseSize: r.caseSize,
        costPrice: toStr(newCost),
        supplierQty: r.supplierQty,
        supplierName: null,
        validUntil: null,
        comment: edit && edit.comment !== undefined ? edit.comment : r.comment,
        matchStatus: "matched" as const,
        previousCost: toStr(oldCost),
        changePercent: toStr(changed ? pctChange(oldCost, newCost) : null),
        flagged: false,
        flagReason: null,
      };
    }),
  );

  // Supersede the brand's prior published uploads (all but the new one).
  await db
    .update(costUploads)
    .set({ status: "superseded", updatedAt: now })
    .where(and(eq(costUploads.brandId, brandId), eq(costUploads.status, "published"), ne(costUploads.id, newUpload.id)));

  // Reprice affected customer price-list lines across the brand.
  // The brand's own lists PLUS every category list (a category spans brands, so an edited
  // EAN may live on a category list too). Promotions use flat prices, so they're excluded.
  const lists = await db
    .select()
    .from(priceLists)
    .where(or(eq(priceLists.brandId, brandId), eq(priceLists.scope, "category")));
  let itemsRepriced = 0;
  const affectedLists = new Set<number>();
  for (const list of lists) {
    const items = await db.select().from(priceListItems).where(eq(priceListItems.priceListId, list.id));
    for (const it of items) {
      const key = it.ean ? normEan(it.ean) : "";
      const edit = key ? editByEan.get(key) : undefined;
      if (!edit) continue;
      const cost = edit.newCost;
      const oldCost = num(it.costPrice);
      if (oldCost !== null && round2(oldCost) === round2(cost)) continue;
      await db
        .update(priceListItems)
        .set({
          costPrice: toStr(cost),
          preparedPrice: toStr(
            computePrepared(it.method as PriceMethod, cost, num(it.marginPercent), num(it.fixedPrice), num(it.plusAmount)),
          ),
          updatedAt: now,
        })
        .where(eq(priceListItems.id, it.id));
      itemsRepriced++;
      affectedLists.add(list.id);
    }
  }
  for (const lid of Array.from(affectedLists)) {
    await db.update(priceLists).set({ baseCostUploadId: newUpload.id, updatedAt: now }).where(eq(priceLists.id, lid));
  }

  return { newUploadId: newUpload.id, costsChanged, itemsRepriced, listsAffected: affectedLists.size };
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

/** The (scope, scopeId) a list assigns against: brand list → ('brand', brandId);
 *  category list → ('category', categoryId). Promotions are never assigned. */
async function listScopeTarget(
  priceListId: number,
): Promise<{ scope: string; scopeId: number; brandId: number | null } | null> {
  const [l] = await db
    .select({ scope: priceLists.scope, brandId: priceLists.brandId, categoryId: priceLists.categoryId })
    .from(priceLists)
    .where(eq(priceLists.id, priceListId));
  if (!l) return null;
  if (l.scope === "category") return l.categoryId != null ? { scope: "category", scopeId: l.categoryId, brandId: null } : null;
  if (l.scope === "promotion") return null; // promotions are global, not assigned
  return l.brandId != null ? { scope: "brand", scopeId: l.brandId, brandId: l.brandId } : null;
}

/** Assign customers to a list. If a customer already has a DIFFERENT list for the
 *  same scope target (brand-for-brand, category-for-category): throw (replace=false)
 *  or swap it (replace=true). A brand list and a category list can coexist — the
 *  resolver decides which price wins (brand beats category). */
export async function assignCustomers(
  priceListId: number,
  customerIds: number[],
  opts: { replace?: boolean; assignedBy?: number | null } = {},
): Promise<{ assigned: number; conflicts: { customerId: number; existingListId: number }[] }> {
  const target = await listScopeTarget(priceListId);
  if (!target) throw new Error("This list can't be assigned (promotions are global; brand/category not set).");
  // A draft list isn't ready — only published lists can be assigned to customers.
  const [pl] = await db.select({ status: priceLists.status }).from(priceLists).where(eq(priceLists.id, priceListId));
  if (!pl) throw new Error("Price list not found");
  if (pl.status !== "published") throw new Error("Publish the price list before assigning customers.");
  const conflicts: { customerId: number; existingListId: number }[] = [];
  let assigned = 0;

  for (const customerId of customerIds) {
    const [existing] = await db
      .select()
      .from(customerPriceLists)
      .where(and(
        eq(customerPriceLists.customerId, customerId),
        eq(customerPriceLists.scope, target.scope),
        eq(customerPriceLists.scopeId, target.scopeId),
      ));

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
        scope: target.scope,
        scopeId: target.scopeId,
        brandId: target.brandId,
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
    .where(and(eq(users.role, "customer"), eq(users.status, "active")));
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
      scope: customerPriceLists.scope,
      brandId: customerPriceLists.brandId,
      brandName: pricingBrands.name,
      categoryName: pricingCategories.name,
      priceListId: customerPriceLists.priceListId,
      listName: priceLists.name,
    })
    .from(customerPriceLists)
    .leftJoin(pricingBrands, eq(customerPriceLists.brandId, pricingBrands.id))
    .leftJoin(pricingCategories, and(eq(customerPriceLists.scope, "category"), eq(customerPriceLists.scopeId, pricingCategories.id)))
    .leftJoin(priceLists, eq(customerPriceLists.priceListId, priceLists.id))
    .where(eq(customerPriceLists.customerId, customerId));
}

/** Every customer→list assignment, with brand + list + customer names — for the admin Assignments overview. */
export async function allAssignments() {
  return db
    .select({
      scope: customerPriceLists.scope,
      brandId: customerPriceLists.brandId,
      brandName: pricingBrands.name,
      categoryName: pricingCategories.name,
      priceListId: customerPriceLists.priceListId,
      listName: priceLists.name,
      listStatus: priceLists.status,
      customerId: customerPriceLists.customerId,
      customerEmail: users.email,
      customerCompany: users.companyName,
      assignedAt: customerPriceLists.assignedAt,
    })
    .from(customerPriceLists)
    .leftJoin(pricingBrands, eq(customerPriceLists.brandId, pricingBrands.id))
    .leftJoin(pricingCategories, and(eq(customerPriceLists.scope, "category"), eq(customerPriceLists.scopeId, pricingCategories.id)))
    .leftJoin(priceLists, eq(customerPriceLists.priceListId, priceLists.id))
    .innerJoin(users, eq(customerPriceLists.customerId, users.id));
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
  imageUrl?: string | null; // borrowed from the public-catalogue product by EAN
  onPromotion?: boolean; // price reflects a live promotion overriding the customer's list price
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
/** Borrow product images from the public catalogue (products table) by EAN so the
 *  customer portal can show a picture for priced items. null when no image exists. */
async function attachImagesByEan(items: PortalItem[]): Promise<void> {
  const eans = Array.from(new Set(items.map((i) => i.ean).filter((e): e is string => !!e)));
  if (!eans.length) return;
  const rows = await db
    .select({ ean: products.ean, imageUrl: products.imageUrl })
    .from(products)
    .where(inArray(products.ean, eans));
  const map = new Map<string, string>();
  for (const r of rows) {
    if (r.ean && r.imageUrl && !map.has(r.ean)) map.set(r.ean, r.imageUrl);
  }
  for (const i of items) {
    i.imageUrl = i.ean ? map.get(i.ean) ?? null : null;
  }
}

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

  // Overlay live promotions: a promo price overrides the customer's list price for that
  // EAN, so the DISPLAYED price matches what buildPricedLines will CHARGE (Phase 1).
  const promos = await activePromotionItemsByEan();
  if (promos.size) {
    for (const i of items) {
      const p = i.ean ? promos.get(i.ean) : undefined;
      if (p) {
        i.price = num(p.preparedPrice);
        i.onPromotion = true;
      }
    }
  }

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
  await attachImagesByEan(items);
  return items;
}

/** A single prepared item a customer is allowed to see (for basket pricing): one of their
 *  own assigned-list items, OR any item on a LIVE promotion (promotions are global). */
export async function getCustomerItem(customerId: number, itemId: number): Promise<PriceListItem | null> {
  const listIds = await customerListIds(customerId);
  if (listIds.length) {
    const [it] = await db
      .select()
      .from(priceListItems)
      .where(and(eq(priceListItems.id, itemId), inArray(priceListItems.priceListId, listIds)));
    if (it) return it;
  }
  // Fallback: the item belongs to a live promotion (e.g. added from the Promotions page).
  const [promo] = await db
    .select({ item: priceListItems })
    .from(priceListItems)
    .innerJoin(priceLists, eq(priceListItems.priceListId, priceLists.id))
    .where(and(eq(priceListItems.id, itemId), ...livePromotionConds(new Date())));
  return promo?.item ?? null;
}

/** Precedence rank of a list scope: lower wins. brand=1, category=2, anything else=3. */
function rankScope(scope: string | null | undefined): number {
  return scope === "brand" ? 1 : scope === "category" ? 2 : 3;
}

/**
 * The best LIVE promotion item for an EAN, or null. Promotions are GLOBAL (apply
 * to every customer) and time-bound: published, and now within [startsAt, endsAt]
 * (null bound = open-ended). Cheapest wins if two promotions overlap an EAN.
 */
/** Conditions for a price_list_items row that belongs to a LIVE promotion right now
 *  (published, isActive, and `now` within [startsAt, endsAt]). Join priceLists first. */
function livePromotionConds(now: Date) {
  return [
    eq(priceListItems.isActive, true),
    eq(priceLists.scope, "promotion"),
    eq(priceLists.status, "published"),
    or(isNull(priceLists.startsAt), lte(priceLists.startsAt, now)),
    or(isNull(priceLists.endsAt), gte(priceLists.endsAt, now)),
  ];
}

async function activePromotionItemByEan(ean: string): Promise<PriceListItem | null> {
  const now = new Date();
  const rows = await db
    .select({ item: priceListItems })
    .from(priceListItems)
    .innerJoin(priceLists, eq(priceListItems.priceListId, priceLists.id))
    .where(and(eq(priceListItems.ean, ean), ...livePromotionConds(now)));
  if (!rows.length) return null;
  rows.sort((a, b) => (num(a.item.preparedPrice) ?? Infinity) - (num(b.item.preparedPrice) ?? Infinity));
  return rows[0].item;
}

/** Map of EAN -> cheapest live-promotion item, across ALL promotions (global). Used to
 *  overlay promo prices onto the portal catalogue and to render the Promotions section. */
async function activePromotionItemsByEan(): Promise<Map<string, PriceListItem>> {
  const now = new Date();
  const rows = await db
    .select({ item: priceListItems })
    .from(priceListItems)
    .innerJoin(priceLists, eq(priceListItems.priceListId, priceLists.id))
    .where(and(...livePromotionConds(now)));
  const map = new Map<string, PriceListItem>();
  for (const { item } of rows) {
    if (!item.ean) continue;
    const prev = map.get(item.ean);
    if (!prev || (num(item.preparedPrice) ?? Infinity) < (num(prev.preparedPrice) ?? Infinity)) {
      map.set(item.ean, item);
    }
  }
  return map;
}

/**
 * Best price-list item for an EAN among a given set of lists, by precedence:
 * (optional) live promotion > brand > category, cheapest preparedPrice breaking
 * ties within a tier. Returns the item + its scope, or null. This is the shared
 * core used by the live resolver and the assign-time conflict preview.
 */
async function bestListItemForEan(
  listIds: number[],
  ean: string,
  includePromo: boolean,
): Promise<{ item: PriceListItem; scope: string } | null> {
  if (includePromo) {
    const promo = await activePromotionItemByEan(ean);
    if (promo) return { item: promo, scope: "promotion" };
  }
  if (!listIds.length) return null;
  const rows = await db
    .select({ item: priceListItems, scope: priceLists.scope })
    .from(priceListItems)
    .innerJoin(priceLists, eq(priceListItems.priceListId, priceLists.id))
    .where(and(eq(priceListItems.ean, ean), inArray(priceListItems.priceListId, listIds)));
  if (!rows.length) return null;
  rows.sort(
    (a, b) =>
      rankScope(a.scope) - rankScope(b.scope) ||
      (num(a.item.preparedPrice) ?? Infinity) - (num(b.item.preparedPrice) ?? Infinity),
  );
  return { item: rows[0].item, scope: rows[0].scope ?? "" };
}

/**
 * Resolve the single price a customer should get for a catalogue product by EAN.
 * Precedence: live promotion (global) > brand list > category list. Returns null
 * if the EAN is in no live promotion and none of the customer's assigned lists.
 */
export async function getCustomerItemByEan(customerId: number, ean: string | null | undefined): Promise<PriceListItem | null> {
  if (!ean) return null;
  const best = await bestListItemForEan(await customerListIds(customerId), ean, true);
  return best?.item ?? null;
}

/** The effective price a customer pays for an EAN, plus WHICH list it came from
 *  (auditability). Same precedence as getCustomerItemByEan. */
export async function effectivePriceForCustomer(
  customerId: number,
  ean: string | null | undefined,
): Promise<{ price: number | null; scope: string; listId: number } | null> {
  if (!ean) return null;
  const best = await bestListItemForEan(await customerListIds(customerId), ean, true);
  if (!best) return null;
  return { price: num(best.item.preparedPrice), scope: best.scope, listId: best.item.priceListId };
}

// ---------------------------------------------------------------
// ASSIGN-TIME CONFLICT PREVIEW (Phase 3) — show, before assigning a list, which
// products would change price for each customer (brand-wins precedence applied).
// ---------------------------------------------------------------
export interface AssignPreviewChange {
  ean: string;
  description: string | null;
  oldPrice: number | null;
  newPrice: number | null;
  oldSource: string; // scope the price came from before (brand/category/none)
  newSource: string;
}
export interface AssignPreviewCustomer {
  customerId: number;
  name: string;
  changeCount: number;
  changes: AssignPreviewChange[]; // capped for payload size
}
export interface AssignPreview {
  listName: string;
  scope: string;
  totalChanges: number;
  customers: AssignPreviewCustomer[];
}

async function customerLabel(customerId: number): Promise<string> {
  const [u] = await db.select({ companyName: users.companyName, email: users.email }).from(users).where(eq(users.id, customerId));
  return u?.companyName || u?.email || `#${customerId}`;
}

/** Preview the price impact of assigning `priceListId` to `customerIds`. Compares each
 *  EAN's effective price (pure list precedence, ignoring transient promos) before vs
 *  after the assignment — replacing any list the customer already holds for the same
 *  scope target. With brand-wins, assigning a category list rarely changes prices a
 *  brand list already covers; this surfaces exactly what (if anything) moves. */
export async function assignPreview(priceListId: number, customerIds: number[]): Promise<AssignPreview> {
  const [list] = await db.select().from(priceLists).where(eq(priceLists.id, priceListId));
  const target = await listScopeTarget(priceListId);
  if (!list || !target) return { listName: list?.name ?? "", scope: list?.scope ?? "", totalChanges: 0, customers: [] };

  const listItems = await db
    .select()
    .from(priceListItems)
    .where(and(eq(priceListItems.priceListId, priceListId), eq(priceListItems.isActive, true)));
  const eans = Array.from(new Set(listItems.map((i) => i.ean).filter(Boolean) as string[])).slice(0, 1000);

  const out: AssignPreviewCustomer[] = [];
  let totalChanges = 0;
  for (const customerId of customerIds) {
    const currentListIds = await customerListIds(customerId);
    // the list (if any) this customer currently holds for the same scope target — it gets replaced
    const [held] = await db
      .select({ priceListId: customerPriceLists.priceListId })
      .from(customerPriceLists)
      .where(and(
        eq(customerPriceLists.customerId, customerId),
        eq(customerPriceLists.scope, target.scope),
        eq(customerPriceLists.scopeId, target.scopeId),
      ));
    const newListIds = currentListIds.filter((id) => id !== held?.priceListId);
    if (!newListIds.includes(priceListId)) newListIds.push(priceListId);

    const changes: AssignPreviewChange[] = [];
    for (const ean of eans) {
      const before = await bestListItemForEan(currentListIds, ean, false);
      const after = await bestListItemForEan(newListIds, ean, false);
      const op = before ? num(before.item.preparedPrice) : null;
      const np = after ? num(after.item.preparedPrice) : null;
      const os = before?.scope ?? "none";
      const ns = after?.scope ?? "none";
      if (op !== np || os !== ns) {
        changes.push({ ean, description: after?.item.description ?? before?.item.description ?? null, oldPrice: op, newPrice: np, oldSource: os, newSource: ns });
      }
    }
    if (changes.length) {
      out.push({ customerId, name: await customerLabel(customerId), changeCount: changes.length, changes: changes.slice(0, 50) });
      totalChanges += changes.length;
    }
  }
  return { listName: list.name, scope: list.scope, totalChanges, customers: out };
}

// ===============================================================
// MONTHLY PROMOTIONS (scope='promotion') — global, time-bound, single price.
// A promotion is a price_lists row with scope='promotion' + startsAt/endsAt and
// price_list_items priced at a flat fixedPrice. It is NOT assigned per customer:
// it applies to everyone while live, overriding brand/category prices by EAN.
// ===============================================================
export interface PromotionSummary extends PriceList {
  itemCount: number;
  /** Live right now (published + within window). */
  isLive: boolean;
}

/** Is this promotion live at `now`? (published + within [startsAt, endsAt]). */
function promoIsLive(list: { status: string; startsAt: Date | null; endsAt: Date | null }, now: Date): boolean {
  if (list.status !== "published") return false;
  if (list.startsAt && list.startsAt > now) return false;
  if (list.endsAt && list.endsAt < now) return false;
  return true;
}

export async function listPromotions(archived: "exclude" | "only" | "include" = "exclude"): Promise<PromotionSummary[]> {
  const conds = [eq(priceLists.scope, "promotion")] as any[];
  if (archived === "exclude") conds.push(ne(priceLists.status, "archived"));
  if (archived === "only") conds.push(eq(priceLists.status, "archived"));
  const lists = await db
    .select()
    .from(priceLists)
    .where(and(...conds))
    .orderBy(desc(priceLists.startsAt), asc(priceLists.name));
  const now = new Date();
  const out: PromotionSummary[] = [];
  for (const list of lists) {
    const [{ count: itemCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(priceListItems)
      .where(eq(priceListItems.priceListId, list.id));
    out.push({ ...list, itemCount, isLive: promoIsLive(list, now) });
  }
  return out;
}

export async function createPromotion(input: {
  name: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
}): Promise<PriceList> {
  const [list] = await db
    .insert(priceLists)
    .values({
      name: input.name.trim(),
      scope: "promotion",
      brandId: null,
      categoryId: null,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      status: "draft",
      type: "customer",
      isActive: true,
    })
    .returning();
  return list;
}

export async function updatePromotionMeta(
  id: number,
  data: { name?: string; startsAt?: Date | null; endsAt?: Date | null; status?: string },
): Promise<PriceList> {
  const patch: any = { updatedAt: new Date() };
  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.startsAt !== undefined) patch.startsAt = data.startsAt;
  if (data.endsAt !== undefined) patch.endsAt = data.endsAt;
  if (data.status !== undefined) {
    patch.status = data.status;
    if (data.status === "published") patch.publishedAt = new Date();
  }
  const [list] = await db
    .update(priceLists)
    .set(patch)
    .where(and(eq(priceLists.id, id), eq(priceLists.scope, "promotion")))
    .returning();
  return list;
}

/** A product the admin can promote: a distinct EAN that exists in the pricing catalogue
 *  (a published brand/category list item), so a promo on it actually overrides a list price. */
export interface PromotableProduct {
  ean: string;
  description: string | null;
  caseSize: string | null;
  pricingCategoryId: number | null;
  costPrice: string | null; // admin reference (their current cost) — not shown to customers
  brandName: string | null;
}

/** Search the pricing catalogue (published brand/category list items) for promotable products,
 *  one row per distinct EAN. Used by the promotion product picker. */
export async function searchPromotableProducts(query: string, limit = 50): Promise<PromotableProduct[]> {
  const q = (query ?? "").trim();
  const conds = [
    inArray(priceLists.scope, ["brand", "category"]),
    eq(priceLists.status, "published"),
    eq(priceListItems.isActive, true),
    sql`${priceListItems.ean} IS NOT NULL AND ${priceListItems.ean} <> ''`,
  ] as any[];
  if (q) conds.push(or(ilike(priceListItems.description, `%${q}%`), ilike(priceListItems.ean, `%${q}%`)));
  const rows = await db
    .select({ item: priceListItems, brandName: pricingBrands.name })
    .from(priceListItems)
    .innerJoin(priceLists, eq(priceListItems.priceListId, priceLists.id))
    .leftJoin(pricingBrands, eq(priceLists.brandId, pricingBrands.id))
    .where(and(...conds))
    .orderBy(asc(priceListItems.description))
    .limit(limit * 6);
  const seen = new Set<string>();
  const out: PromotableProduct[] = [];
  for (const r of rows) {
    const ean = r.item.ean!;
    if (seen.has(ean)) continue;
    seen.add(ean);
    out.push({
      ean,
      description: r.item.description,
      caseSize: r.item.caseSize,
      pricingCategoryId: r.item.pricingCategoryId ?? null,
      costPrice: r.item.costPrice,
      brandName: r.brandName ?? null,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** Add products (by EAN) to a promotion at a flat price each (skips EANs already on it). */
export async function addPromotionItems(
  listId: number,
  items: {
    ean: string;
    description?: string | null;
    caseSize?: string | null;
    costPrice?: string | number | null;
    pricingCategoryId?: number | null;
    price: number;
  }[],
): Promise<{ added: number; skipped: number }> {
  if (!items.length) return { added: 0, skipped: 0 };
  const existing = await db
    .select({ ean: priceListItems.ean })
    .from(priceListItems)
    .where(eq(priceListItems.priceListId, listId));
  const have = new Set(existing.map((r) => r.ean).filter(Boolean) as string[]);

  const values: any[] = [];
  let skipped = 0;
  for (const it of items) {
    const ean = (it.ean ?? "").trim();
    if (!ean || have.has(ean)) { skipped++; continue; }
    have.add(ean);
    const price = round2(Number(it.price) || 0);
    values.push({
      priceListId: listId,
      costRowId: null,
      ean,
      description: it.description ?? null,
      pricingCategoryId: it.pricingCategoryId ?? null,
      caseSize: it.caseSize ?? null,
      costPrice: it.costPrice != null ? toStr(Number(it.costPrice)) : null, // snapshot for admin margin visibility
      method: "fixed" as const,
      marginPercent: null,
      fixedPrice: toStr(price),
      plusAmount: null,
      preparedPrice: toStr(price),
      supplierQty: null,
      isActive: true,
    });
  }
  if (values.length) await db.insert(priceListItems).values(values);
  return { added: values.length, skipped };
}

export async function removePromotionItem(listId: number, itemId: number): Promise<void> {
  await db
    .delete(priceListItems)
    .where(and(eq(priceListItems.id, itemId), eq(priceListItems.priceListId, listId)));
}

export async function setPromotionItemPrice(listId: number, itemId: number, price: number): Promise<void> {
  const p = toStr(round2(Number(price) || 0));
  await db
    .update(priceListItems)
    .set({ fixedPrice: p, preparedPrice: p, method: "fixed", updatedAt: new Date() })
    .where(and(eq(priceListItems.id, itemId), eq(priceListItems.priceListId, listId)));
}

/** Every product on a LIVE promotion right now, priced for the portal "Promotions" section
 *  (global — same for all customers). Cost/margin never included. */
export async function activePromotionsCatalogue(): Promise<PortalItem[]> {
  const map = await activePromotionItemsByEan();
  const out: PortalItem[] = [];
  for (const item of Array.from(map.values())) {
    out.push({
      itemId: item.id,
      priceListId: item.priceListId,
      brandId: null,
      brandName: null,
      pricingCategoryId: item.pricingCategoryId ?? null,
      ean: item.ean,
      description: item.description,
      caseSize: item.caseSize,
      price: num(item.preparedPrice),
      availability: availabilityOf(item.supplierQty),
      availableQty: item.supplierQty ?? null,
      onPromotion: true,
    });
  }
  out.sort((a, b) => (a.description ?? "").localeCompare(b.description ?? ""));
  await attachImagesByEan(out);
  return out;
}
