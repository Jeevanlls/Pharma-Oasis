// ============================================================
// Persistence for customer pricing: cost uploads, price lists & rules.
// Kept separate from the large storage.ts for clarity.
// ============================================================
import { db } from "./db";
import {
  costUploads,
  costUploadRows,
  priceLists,
  priceListRules,
  products,
  brands,
  pricingBrands,
  pricingCategories,
  users,
  orders,
  orderItems,
} from "@shared/schema";
import { eq, and, desc, ne, lt, sql, inArray, isNull, isNotNull, gte } from "drizzle-orm";
import type {
  CostUpload,
  CostUploadRow,
  InsertPriceList,
  PriceList,
  PriceListRule,
  Order,
  OrderItem,
} from "@shared/schema";
import type { PreviewRow } from "./cost-importer";
import { ensurePricingCategory } from "./pricing-v2";

const toStr = (n: number | null | undefined): string | null =>
  n === null || n === undefined ? null : String(n);

// ---------- COST UPLOADS ----------

export interface CreateUploadInput {
  brandId: number;
  supplierName?: string | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  comment?: string | null;
  fileName?: string | null;
  uploadedBy?: number | null;
  categoryId?: number | null;
  rows: PreviewRow[];
}

export async function createDraftUpload(input: CreateUploadInput): Promise<CostUpload> {
  const matched = input.rows.filter((r) => r.matchStatus === "matched").length;
  const [upload] = await db
    .insert(costUploads)
    .values({
      brandId: input.brandId,
      supplierName: input.supplierName ?? null,
      validFrom: input.validFrom ?? null,
      validUntil: input.validUntil ?? null,
      comment: input.comment ?? null,
      fileName: input.fileName ?? null,
      uploadedBy: input.uploadedBy ?? null,
      status: "draft",
      rowCount: input.rows.length,
      matchedCount: matched,
      unmatchedCount: input.rows.length - matched,
    })
    .returning();

  if (input.rows.length) {
    // Resolve (creating as needed) a standalone pricing-category id per row.
    const uniqueCats = Array.from(new Set(input.rows.map((r) => (r.categoryName || "").trim()).filter(Boolean)));
    const catIdByName = new Map<string, number | null>();
    for (const name of uniqueCats) catIdByName.set(name, await ensurePricingCategory(name));

    // If a category was picked in the UI, stamp every row with it (overrides the file).
    let overrideCatId: number | null = null;
    let overrideCatName: string | null = null;
    if (input.categoryId) {
      const [cat] = await db.select().from(pricingCategories).where(eq(pricingCategories.id, input.categoryId));
      if (cat) { overrideCatId = cat.id; overrideCatName = cat.name; }
    }

    await db.insert(costUploadRows).values(
      input.rows.map((r) => ({
        uploadId: upload.id,
        productId: r.productId,
        ean: r.ean || null,
        description: r.description || null,
        categoryName: overrideCatName ?? (r.categoryName || null),
        pricingCategoryId: overrideCatId ?? (catIdByName.get((r.categoryName || "").trim()) ?? null),
        caseSize: r.caseSize || null,
        costPrice: toStr(r.costPrice),
        supplierQty: r.supplierQty,
        supplierName: null,
        validUntil: null,
        comment: r.comment || null,
        matchStatus: r.matchStatus,
        previousCost: toStr(r.previousCost),
        changePercent: toStr(r.changePercent),
        flagged: r.flagged,
        flagReason: r.flagReason || null,
      })),
    );
  }
  return upload;
}

export async function brandsByPricingCategory(): Promise<Record<number, { id: number; name: string; items: number }[]>> {
  // For each pricing category, which brands (suppliers) have published cost rows in it,
  // and how many. Resolves category by pricingCategoryId, falling back to categoryName.
  const cats = await db.select({ id: pricingCategories.id, name: pricingCategories.name }).from(pricingCategories);
  const nameToId = new Map<string, number>();
  for (const c of cats) nameToId.set(c.name.trim().toLowerCase(), c.id);

  const ups = await db
    .select({ id: costUploads.id, brandId: costUploads.brandId })
    .from(costUploads)
    .where(eq(costUploads.status, "published"));
  if (ups.length === 0) return {};
  const upBrand = new Map<number, number>();
  for (const u of ups) upBrand.set(u.id, u.brandId);

  const brands = await db.select({ id: pricingBrands.id, name: pricingBrands.name }).from(pricingBrands);
  const brandName = new Map<number, string>();
  for (const b of brands) brandName.set(b.id, b.name);

  const rows = await db
    .select({ uploadId: costUploadRows.uploadId, catId: costUploadRows.pricingCategoryId, catName: costUploadRows.categoryName })
    .from(costUploadRows)
    .where(inArray(costUploadRows.uploadId, ups.map((u) => u.id)));

  const acc: Record<number, Record<number, number>> = {};
  for (const r of rows) {
    const catId = r.catId ?? (r.catName ? nameToId.get(r.catName.trim().toLowerCase()) : undefined);
    if (!catId) continue;
    const brandId = upBrand.get(r.uploadId);
    if (!brandId) continue;
    (acc[catId] ??= {});
    acc[catId][brandId] = (acc[catId][brandId] ?? 0) + 1;
  }

  const out: Record<number, { id: number; name: string; items: number }[]> = {};
  for (const [catId, brandMap] of Object.entries(acc)) {
    out[Number(catId)] = Object.entries(brandMap)
      .map(([bid, items]) => ({ id: Number(bid), name: brandName.get(Number(bid)) ?? `#${bid}`, items }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return out;
}

export async function publishedCostStatusByBrand(): Promise<Record<number, { publishedAt: string | null; rowCount: number }>> {
  const rows = await db
    .select({ brandId: costUploads.brandId, publishedAt: costUploads.publishedAt, rowCount: costUploads.rowCount })
    .from(costUploads)
    .where(eq(costUploads.status, "published"))
    .orderBy(desc(costUploads.publishedAt));
  const map: Record<number, { publishedAt: string | null; rowCount: number }> = {};
  for (const r of rows) {
    if (!(r.brandId in map)) {
      map[r.brandId] = {
        publishedAt: r.publishedAt ? new Date(r.publishedAt as any).toISOString() : null,
        rowCount: r.rowCount ?? 0,
      };
    }
  }
  return map;
}

export async function listUploads(brandId?: number): Promise<(CostUpload & { brandName: string | null })[]> {
  const rows = await db
    .select({ upload: costUploads, brandName: pricingBrands.name })
    .from(costUploads)
    .leftJoin(pricingBrands, eq(costUploads.brandId, pricingBrands.id))
    .where(brandId ? eq(costUploads.brandId, brandId) : sql`true`)
    .orderBy(desc(costUploads.createdAt));
  return rows.map((r) => ({ ...r.upload, brandName: r.brandName }));
}

export async function getUpload(id: number): Promise<{ upload: CostUpload; rows: CostUploadRow[] } | null> {
  const [upload] = await db.select().from(costUploads).where(eq(costUploads.id, id));
  if (!upload) return null;
  const rows = await db.select().from(costUploadRows).where(eq(costUploadRows.uploadId, id));
  return { upload, rows };
}

export async function deleteUpload(id: number): Promise<void> {
  await db.delete(costUploadRows).where(eq(costUploadRows.uploadId, id));
  await db.delete(costUploads).where(eq(costUploads.id, id));
}

const normEan = (v: string | null | undefined): string =>
  (v ?? "").toString().replace(/\s+/g, "").replace(/\.0$/, "").trim();

/** Replace a draft upload's rows with an edited set (from the review screen) and
 *  refresh the cached counts. The caller (route) re-validates via analyzeRows so the
 *  PreviewRows already carry final status/flags/comment. */
export async function replaceDraftRows(id: number, rows: PreviewRow[]): Promise<void> {
  const found = await getUpload(id);
  if (!found) throw new Error("Upload not found");
  if (found.upload.status === "published") throw new Error("Cannot edit a published upload");
  const brandId = found.upload.brandId;

  await db.delete(costUploadRows).where(eq(costUploadRows.uploadId, id));

  if (rows.length) {
    const uniqueCats = Array.from(new Set(rows.map((r) => (r.categoryName || "").trim()).filter(Boolean)));
    const catIdByName = new Map<string, number | null>();
    for (const name of uniqueCats) catIdByName.set(name, await ensurePricingCategory(name));

    await db.insert(costUploadRows).values(
      rows.map((r) => ({
        uploadId: id,
        productId: r.productId,
        ean: r.ean || null,
        description: r.description || null,
        categoryName: r.categoryName || null,
        pricingCategoryId: catIdByName.get((r.categoryName || "").trim()) ?? null,
        caseSize: r.caseSize || null,
        costPrice: toStr(r.costPrice),
        supplierQty: r.supplierQty,
        supplierName: null,
        validUntil: null,
        comment: r.comment || null,
        matchStatus: r.matchStatus,
        previousCost: toStr(r.previousCost),
        changePercent: toStr(r.changePercent),
        flagged: r.flagged,
        flagReason: r.flagReason || null,
      })),
    );
  }

  const matched = rows.filter((r) => r.matchStatus === "matched").length;
  await db
    .update(costUploads)
    .set({ rowCount: rows.length, matchedCount: matched, unmatchedCount: rows.length - matched, updatedAt: new Date() })
    .where(eq(costUploads.id, id));
  void brandId;
}

/** Update the upload-level internal comment (editable until published). */
export async function updateUploadComment(id: number, comment: string | null): Promise<void> {
  await db
    .update(costUploads)
    .set({ comment: comment || null, updatedAt: new Date() })
    .where(eq(costUploads.id, id));
}

/** Publish a draft: supersede the brand's previous published batch, then push
 *  matched costs onto products (active cost cache).
 *  Gating: refuses to publish while duplicate EANs remain; incomplete rows
 *  (missing EAN or cost) are skipped (deleted) and reported, never published. */
export async function publishUpload(id: number): Promise<{ updated: number; skipped: number; noCost: number }> {
  const found = await getUpload(id);
  if (!found) throw new Error("Upload not found");
  const { upload, rows } = found;
  if (upload.status === "published") return { updated: 0, skipped: 0, noCost: 0 };

  // Hard block: duplicate EANs must be resolved before publishing.
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = normEan(r.ean);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const dupes = Array.from(counts.entries()).filter(([, n]) => n > 1).map(([k]) => k);
  if (dupes.length) {
    throw new Error(
      `Cannot publish: ${dupes.length} duplicate EAN(s) in the file. Remove the duplicates and re-upload before publishing.`,
    );
  }

  // Drop only rows with NO EAN (they can't be identified, matched or priced).
  // Rows that have an EAN but a zero/blank cost are KEPT as "needs cost" — they stay
  // visible in Current Costs and are simply excluded from price lists until a cost is added.
  const noEan = rows.filter((r) => !normEan(r.ean));
  if (noEan.length) {
    await db.delete(costUploadRows).where(
      and(eq(costUploadRows.uploadId, id), inArray(costUploadRows.id, noEan.map((r) => r.id))),
    );
  }
  const skipped = noEan.length;
  const liveRows = rows.filter((r) => normEan(r.ean));
  const noCost = liveRows.filter((r) => r.costPrice === null || Number(r.costPrice) <= 0).length;

  // Supersede prior published uploads for the same brand.
  await db
    .update(costUploads)
    .set({ status: "superseded", updatedAt: new Date() })
    .where(and(eq(costUploads.brandId, upload.brandId), eq(costUploads.status, "published"), ne(costUploads.id, id)));

  const now = new Date();
  let updated = 0;
  for (const row of liveRows) {
    if (!row.productId || row.costPrice === null || Number(row.costPrice) <= 0) continue;
    const expiry = row.validUntil ?? upload.validUntil ?? null;
    const status = expiry && expiry < now ? "expired" : "active";
    await db
      .update(products)
      .set({
        activeCostPrice: row.costPrice,
        activeCostUploadId: upload.id,
        costEffectiveDate: now,
        costExpiryDate: expiry,
        costStatus: status,
        availableQty: row.supplierQty,
        updatedAt: now,
      })
      .where(eq(products.id, row.productId));
    updated++;
  }

  await db
    .update(costUploads)
    .set({
      status: "published",
      publishedAt: now,
      updatedAt: now,
      rowCount: liveRows.length,
      matchedCount: liveRows.filter((r) => r.matchStatus === "matched").length,
      unmatchedCount: liveRows.filter((r) => r.matchStatus !== "matched").length,
    })
    .where(eq(costUploads.id, id));

  return { updated, skipped, noCost };
}

/** Mark products whose cost validity has passed as expired (price still shown). */
export async function refreshExpiredCosts(): Promise<number> {
  const res = await db
    .update(products)
    .set({ costStatus: "expired" })
    .where(and(eq(products.costStatus, "active"), lt(products.costExpiryDate, new Date())))
    .returning({ id: products.id });
  return res.length;
}

/** Brands that currently have at least one expired cost (for the admin alert). */
export async function expiredCostBrands(): Promise<{ brandId: number; brandName: string | null; count: number }[]> {
  const rows = await db
    .select({ brandId: products.brandId, brandName: brands.name, count: sql<number>`count(*)::int` })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(eq(products.costStatus, "expired"))
    .groupBy(products.brandId, brands.name);
  return rows;
}

// ---------- PRICE LISTS & RULES ----------

export async function listPriceLists(): Promise<PriceList[]> {
  return db.select().from(priceLists).orderBy(desc(priceLists.type), priceLists.name);
}

export async function getPriceListWithRules(
  id: number,
): Promise<{ list: PriceList; rules: PriceListRule[] } | null> {
  const [list] = await db.select().from(priceLists).where(eq(priceLists.id, id));
  if (!list) return null;
  const rules = await db.select().from(priceListRules).where(eq(priceListRules.priceListId, id));
  return { list, rules };
}

export async function createPriceList(data: InsertPriceList): Promise<PriceList> {
  const [list] = await db.insert(priceLists).values(data).returning();
  return list;
}

export async function updatePriceList(id: number, data: Partial<InsertPriceList>): Promise<PriceList> {
  const [list] = await db
    .update(priceLists)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(priceLists.id, id))
    .returning();
  return list;
}

export async function deletePriceList(id: number): Promise<void> {
  await db.delete(priceListRules).where(eq(priceListRules.priceListId, id));
  await db.delete(priceLists).where(eq(priceLists.id, id));
  // Unassign any customers pointing at it.
  await db.update(users).set({ priceListId: null }).where(eq(users.priceListId, id));
}

export interface RuleInput {
  level: "overall" | "brand" | "category" | "product";
  targetId?: number | null;
  marginPercent?: number | null;
  fixedPrice?: number | null;
  notes?: string | null;
}

/** Replace the full rule set for a price list (transactional-ish: delete + insert). */
export async function setRules(priceListId: number, rules: RuleInput[]): Promise<PriceListRule[]> {
  await db.delete(priceListRules).where(eq(priceListRules.priceListId, priceListId));
  if (rules.length) {
    await db.insert(priceListRules).values(
      rules.map((r) => ({
        priceListId,
        level: r.level,
        targetId: r.level === "overall" ? null : r.targetId ?? null,
        marginPercent: toStr(r.marginPercent),
        fixedPrice: toStr(r.fixedPrice),
        isActive: true,
        notes: r.notes ?? null,
      })),
    );
  }
  return db.select().from(priceListRules).where(eq(priceListRules.priceListId, priceListId));
}

/** Assign (or clear) a customer's price list. */
export async function assignCustomerPriceList(userId: number, priceListId: number | null): Promise<void> {
  await db.update(users).set({ priceListId, updatedAt: new Date() }).where(eq(users.id, userId));
}

// ---------- ORDERS ----------

export interface OrderLineInput {
  productId?: number | null;
  priceListItemId?: number | null;
  ean?: string | null;
  description?: string | null;
  quantity: number;
  unitCost: number | null;
  unitPrice: number | null;
  marginApplied: number | null;
  lineTotal: number;
}

export async function createOrder(input: {
  userId: number;
  priceListId: number | null;
  totalAmount: number;
  customerNotes: string | null;
  lines: OrderLineInput[];
  quoteId?: number | null; // set when this order came from an accepted quote
  status?: string; // defaults to "submitted"
}): Promise<Order> {
  const [order] = await db
    .insert(orders)
    .values({
      userId: input.userId,
      status: input.status ?? "submitted",
      priceListId: input.priceListId,
      quoteId: input.quoteId ?? null,
      totalAmount: toStr(input.totalAmount),
      customerNotes: input.customerNotes,
    })
    .returning();

  if (input.lines.length) {
    await db.insert(orderItems).values(
      input.lines.map((l) => ({
        orderId: order.id,
        productId: l.productId ?? null,
        priceListItemId: l.priceListItemId ?? null,
        ean: l.ean ?? null,
        description: l.description ?? null,
        quantity: l.quantity,
        unitCost: toStr(l.unitCost),
        unitPrice: toStr(l.unitPrice),
        marginApplied: toStr(l.marginApplied),
        lineTotal: toStr(l.lineTotal),
      })),
    );
  }
  return order;
}

export async function getOrdersByUser(userId: number): Promise<Order[]> {
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

/** The order created from a given quote, if any (prevents duplicate conversion). */
export async function getOrderByQuoteId(quoteId: number): Promise<Order | undefined> {
  const [order] = await db.select().from(orders).where(eq(orders.quoteId, quoteId));
  return order;
}

export async function getOrderWithItems(
  id: number,
): Promise<{ order: Order; items: (OrderItem & { productName: string | null })[] } | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return null;
  const items = await db
    .select({ item: orderItems, productName: products.productName })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, id));
  return { order, items: items.map((r) => ({ ...r.item, productName: r.productName ?? r.item.description })) };
}

export async function listAllOrders(
  opts?: { archived?: boolean },
): Promise<(Order & { companyName: string | null; email: string | null })[]> {
  const where =
    opts?.archived === true ? isNotNull(orders.archivedAt)
    : opts?.archived === false ? isNull(orders.archivedAt)
    : undefined;
  const rows = await db
    .select({ order: orders, companyName: users.companyName, email: users.email })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .where(where as any)
    .orderBy(desc(orders.createdAt));
  return rows.map((r) => ({ ...r.order, companyName: r.companyName, email: r.email }));
}

// Allowed order status moves. "entered" = keyed into the external inventory
// system (terminal/archived). Legacy "processing"/"completed" are tolerated.
const ORDER_TRANSITIONS: Record<string, string[]> = {
  submitted: ["confirmed", "entered", "cancelled"],
  confirmed: ["entered", "cancelled"],
  processing: ["confirmed", "entered", "cancelled"],
  completed: ["entered", "cancelled"],
  entered: ["cancelled"],
  cancelled: [],
};

export function canTransitionOrder(from: string, to: string): boolean {
  if (from === to) return true;
  return (ORDER_TRANSITIONS[from] ?? []).includes(to);
}

export async function respondToOrder(
  id: number,
  data: { status?: string; adminResponse?: string; adminNotes?: string },
): Promise<Order> {
  // Validate a status change against the allowed transitions.
  if (data.status) {
    const [current] = await db.select().from(orders).where(eq(orders.id, id));
    if (!current) throw new Error("Order not found");
    if (!canTransitionOrder(current.status, data.status)) {
      throw new Error(`Cannot change order from "${current.status}" to "${data.status}".`);
    }
  }
  const [order] = await db
    .update(orders)
    .set({
      ...(data.status ? { status: data.status } : {}),
      ...(data.adminResponse !== undefined ? { adminResponse: data.adminResponse, respondedAt: new Date() } : {}),
      ...(data.adminNotes !== undefined ? { adminNotes: data.adminNotes } : {}),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, id))
    .returning();
  return order;
}

/** Mark an order as keyed into the external inventory system → archives it off the active worklist. */
export async function enterOrderToInventory(id: number, adminId: number): Promise<Order> {
  const now = new Date();
  const [order] = await db
    .update(orders)
    .set({ status: "entered", enteredToInventoryAt: now, enteredBy: adminId, archivedAt: now, updatedAt: now })
    .where(eq(orders.id, id))
    .returning();
  return order;
}

/** Bulk action over many orders: mark entered, or set a status (validated per order). */
export async function bulkUpdateOrders(
  ids: number[],
  action: { type: "enter"; adminId: number } | { type: "status"; status: string },
): Promise<number> {
  if (!ids.length) return 0;
  let count = 0;
  for (const id of ids) {
    try {
      if (action.type === "enter") {
        await enterOrderToInventory(id, action.adminId);
      } else {
        await respondToOrder(id, { status: action.status });
      }
      count++;
    } catch {
      // Skip ones whose transition isn't allowed; report how many succeeded.
    }
  }
  return count;
}

/** Dashboard KPIs for the Sales worklist. */
export async function getOrderStats(): Promise<{ newCount: number; toFulfil: number; doneThisWeek: number; activeTotal: number }> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [newRow] = await db.select({ n: sql<number>`count(*)::int` }).from(orders)
    .where(and(eq(orders.status, "submitted"), isNull(orders.archivedAt)));
  const [fulfilRow] = await db.select({ n: sql<number>`count(*)::int` }).from(orders)
    .where(and(eq(orders.status, "confirmed"), isNull(orders.archivedAt)));
  const [doneRow] = await db.select({ n: sql<number>`count(*)::int` }).from(orders)
    .where(and(isNotNull(orders.enteredToInventoryAt), gte(orders.enteredToInventoryAt, weekAgo)));
  const [activeRow] = await db.select({ n: sql<number>`count(*)::int` }).from(orders)
    .where(isNull(orders.archivedAt));
  return {
    newCount: newRow?.n ?? 0,
    toFulfil: fulfilRow?.n ?? 0,
    doneThisWeek: doneRow?.n ?? 0,
    activeTotal: activeRow?.n ?? 0,
  };
}

/** Ensure a baseline default list exists; returns its id. */
export async function ensureDefaultPriceList(): Promise<number> {
  const [existing] = await db.select().from(priceLists).where(eq(priceLists.isDefault, true));
  if (existing) return existing.id;
  const [created] = await db
    .insert(priceLists)
    .values({ name: "Standard", type: "tier", isDefault: true, isActive: true, notes: "Baseline list for new customers" })
    .returning();
  await db.insert(priceListRules).values({
    priceListId: created.id,
    level: "overall",
    targetId: null,
    marginPercent: "20",
    isActive: true,
  });
  return created.id;
}
