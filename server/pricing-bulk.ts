/**
 * BULK PRICING OPERATIONS
 * -----------------------
 * Everything in Customer Pricing was built one brand at a time, which was right
 * when there was one brand. With ~60 brands arriving from Price Manager — and
 * thousands once RD's clean-up settles — publishing costs, building lists and
 * assigning customers by hand stops being tedious and starts being undoable.
 *
 * These three actions do the same work as the per-brand buttons, in a loop,
 * through the SAME functions. Nothing here reimplements pricing: publishing
 * still goes through publishUpload, a list is still built by buildPriceList,
 * an assignment still goes through assignCustomers with its own conflict rules.
 * If those change, this follows automatically.
 *
 * Every action has a preview that writes nothing, because the whole point of a
 * bulk button is that you cannot easily undo it one row at a time.
 */
import { and, eq, inArray, like, isNotNull, sql } from "drizzle-orm";
import { db } from "./db";
import { costUploads, customerPriceLists, priceListItems, priceLists, pricingBrands } from "@shared/schema";
import * as pricingStore from "./pricing-store";
import * as pricingV2 from "./pricing-v2";
import { PM_SYNC_FILE_NAME } from "./pm-sync";

export type RoundingMode = "none" | "charm_99" | "charm_49_99" | "charm_x9";

// ---------------------------------------------------------------------------
// 1. PUBLISH EVERY DRAFT COST UPLOAD
// ---------------------------------------------------------------------------

export interface DraftSummary {
  uploadId: number;
  brandId: number;
  brand: string;
  rows: number;
  fromPriceManager: boolean;
}

/** Which drafts are waiting, and where they came from. Writes nothing. */
export async function publishPreview(): Promise<{
  drafts: DraftSummary[];
  fromPriceManager: number;
  other: number;
}> {
  const rows = await db
    .select({
      uploadId: costUploads.id,
      brandId: costUploads.brandId,
      fileName: costUploads.fileName,
      brand: pricingBrands.name,
    })
    .from(costUploads)
    .leftJoin(pricingBrands, eq(pricingBrands.id, costUploads.brandId))
    .where(eq(costUploads.status, "draft"));

  const drafts: DraftSummary[] = [];
  for (const r of rows) {
    const counted = await pricingStore.getUpload(r.uploadId);
    drafts.push({
      uploadId: r.uploadId,
      brandId: r.brandId,
      brand: r.brand ?? `#${r.brandId}`,
      rows: counted?.rows.length ?? 0,
      fromPriceManager: (r.fileName ?? "").startsWith(PM_SYNC_FILE_NAME),
    });
  }
  drafts.sort((a, b) => a.brand.localeCompare(b.brand));

  return {
    drafts,
    fromPriceManager: drafts.filter((d) => d.fromPriceManager).length,
    other: drafts.filter((d) => !d.fromPriceManager).length,
  };
}

export interface PublishOutcome {
  uploadId: number;
  brand: string;
  ok: boolean;
  /** rows whose cost went live */
  updated?: number;
  /** rows dropped for having no barcode at all */
  skipped?: number;
  /** rows kept but with no usable cost — they show as "price on request" */
  noCost?: number;
  /** repeated rows folded away because they said the same thing twice */
  collapsed?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// 1b. WHY A DRAFT WILL NOT PUBLISH
// ---------------------------------------------------------------------------

export interface DraftBlocker {
  uploadId: number;
  brandId: number;
  brand: string;
  rows: number;
  /** barcodes repeated at the same cost — harmless, folded away on publish */
  repeated: number;
  /** barcodes repeated at DIFFERENT costs — these stop the publish */
  conflicts: pricingStore.DuplicateConflict[];
}

/**
 * Dry-run the duplicate check that publishing runs, for every waiting draft.
 *
 * This writes nothing. It exists because "9 brands did not publish" is not an
 * answer anyone can act on — the barcode and the two prices are.
 */
export async function publishBlockers(): Promise<{
  checked: number;
  blocked: DraftBlocker[];
  cleanRepeats: number;
}> {
  const { drafts } = await publishPreview();
  const blocked: DraftBlocker[] = [];
  let cleanRepeats = 0;

  for (const d of drafts) {
    const found = await pricingStore.getUpload(d.uploadId);
    if (!found) continue;
    const groups = pricingStore.groupRowsByEan(found.rows);
    const conflicts: pricingStore.DuplicateConflict[] = [];
    let repeated = 0;
    for (const [ean, group] of groups) {
      if (group.length < 2) continue;
      if (pricingStore.duplicateGroupAgrees(group)) {
        repeated += group.length - 1;
      } else {
        conflicts.push({
          ean,
          description: group.find((r) => r.description)?.description ?? null,
          costs: Array.from(
            new Set(
              group.map((r) =>
                r.costPrice === null || r.costPrice === "" ? "no cost" : Number(r.costPrice).toFixed(2),
              ),
            ),
          ),
        });
      }
    }
    cleanRepeats += repeated;
    if (conflicts.length) {
      conflicts.sort((a, b) => a.ean.localeCompare(b.ean));
      blocked.push({
        uploadId: d.uploadId,
        brandId: d.brandId,
        brand: d.brand,
        rows: d.rows,
        repeated,
        conflicts,
      });
    }
  }

  blocked.sort((a, b) => a.brand.localeCompare(b.brand));
  return { checked: drafts.length, blocked, cleanRepeats };
}

/**
 * Publish the waiting drafts.
 *
 * One failure does not stop the run: a brand whose file repeats a barcode at
 * two different costs throws inside publishUpload, and the right answer is to
 * publish the other 59 and report that one, not to abandon the lot halfway
 * through. publishBlockers() above says exactly which barcodes those are.
 */
export async function publishAllDrafts(opts: {
  priceManagerOnly?: boolean;
  uploadIds?: number[];
} = {}): Promise<{ published: number; failed: number; results: PublishOutcome[] }> {
  const { drafts } = await publishPreview();
  const wanted = opts.uploadIds?.length ? new Set(opts.uploadIds) : null;

  const targets = drafts.filter((d) => {
    if (wanted) return wanted.has(d.uploadId);
    if (opts.priceManagerOnly) return d.fromPriceManager;
    return true;
  });

  const results: PublishOutcome[] = [];
  for (const d of targets) {
    try {
      const r = await pricingStore.publishUpload(d.uploadId);
      results.push({ uploadId: d.uploadId, brand: d.brand, ok: true, ...r });
    } catch (e: any) {
      results.push({
        uploadId: d.uploadId,
        brand: d.brand,
        ok: false,
        error: e?.message || String(e),
      });
    }
  }

  return {
    published: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}

// ---------------------------------------------------------------------------
// 1c. PUT A NEW CUSTOMER ON THE STANDARD LISTS
// ---------------------------------------------------------------------------

/**
 * Give one or more customers every published brand list they are not already on.
 *
 * A customer with no assignments sees no prices at all, so an invite that
 * creates a login without doing this hands someone an empty catalogue. This is
 * the same rule as the bulk assign screen — never touch a brand the customer is
 * already assigned for, because that is where negotiated rates live — but it
 * runs as three queries rather than one per list, because it sits in the path
 * of sending an invite and cannot take forty seconds.
 */
export async function grantStandardLists(
  customerIds: number[],
  opts: { assignedBy?: number | null } = {},
): Promise<{ assigned: number; skipped: number }> {
  if (!customerIds.length) return { assigned: 0, skipped: 0 };

  const lists = await db
    .select({ id: priceLists.id, brandId: priceLists.brandId })
    .from(priceLists)
    .where(and(eq(priceLists.status, "published"), eq(priceLists.scope, "brand"), isNotNull(priceLists.brandId)));
  if (!lists.length) return { assigned: 0, skipped: 0 };

  const existing = await db
    .select({ customerId: customerPriceLists.customerId, scopeId: customerPriceLists.scopeId })
    .from(customerPriceLists)
    .where(and(eq(customerPriceLists.scope, "brand"), inArray(customerPriceLists.customerId, customerIds)));
  const taken = new Set(existing.map((e) => `${e.customerId}:${e.scopeId}`));

  const values: (typeof customerPriceLists.$inferInsert)[] = [];
  let skipped = 0;
  for (const customerId of customerIds) {
    for (const l of lists) {
      if (l.brandId == null) continue;
      if (taken.has(`${customerId}:${l.brandId}`)) {
        skipped++;
        continue;
      }
      values.push({
        customerId,
        priceListId: l.id,
        scope: "brand",
        scopeId: l.brandId,
        brandId: l.brandId,
        assignedBy: opts.assignedBy ?? null,
      });
    }
  }
  if (!values.length) return { assigned: 0, skipped };

  // Chunked: one statement per ~500 rows keeps the parameter count sane.
  let assigned = 0;
  for (let i = 0; i < values.length; i += 500) {
    const chunk = values.slice(i, i + 500);
    await db.insert(customerPriceLists).values(chunk).onConflictDoNothing();
    assigned += chunk.length;
  }
  return { assigned, skipped };
}

// ---------------------------------------------------------------------------
// 2. BUILD A PRICE LIST FOR EVERY BRAND
// ---------------------------------------------------------------------------

export interface BrandBuildState {
  brandId: number;
  brand: string;
  hasLiveCosts: boolean;
  existingListId?: number;
  existingListName?: string;
  /** what a run would do with this brand */
  action: "build" | "already_has_list" | "no_costs";
}

/** What a bulk build would do, brand by brand. Writes nothing. */
export async function buildPreview(): Promise<{
  rows: BrandBuildState[];
  toBuild: number;
  alreadyHaveList: number;
  noCosts: number;
}> {
  const brands = await db.select().from(pricingBrands).where(eq(pricingBrands.isActive, true));

  // One list per brand is the rule here. A brand that already has a live or
  // draft list is left alone: rebuilding would either duplicate it or quietly
  // throw away margins that were tweaked by hand.
  const lists = await db
    .select({ id: priceLists.id, name: priceLists.name, brandId: priceLists.brandId, status: priceLists.status })
    .from(priceLists)
    .where(and(eq(priceLists.scope, "brand"), isNotNull(priceLists.brandId)));
  const listByBrand = new Map<number, { id: number; name: string }>();
  for (const l of lists) {
    if (l.status === "archived") continue;
    if (l.brandId != null && !listByBrand.has(l.brandId)) listByBrand.set(l.brandId, { id: l.id, name: l.name });
  }

  const rows: BrandBuildState[] = [];
  for (const b of brands) {
    const existing = listByBrand.get(b.id);
    const base = await pricingV2.getBaseCostForBrand(b.id);
    const hasLiveCosts = !!base && base.rows.length > 0;
    rows.push({
      brandId: b.id,
      brand: b.name,
      hasLiveCosts,
      existingListId: existing?.id,
      existingListName: existing?.name,
      action: existing ? "already_has_list" : hasLiveCosts ? "build" : "no_costs",
    });
  }
  rows.sort((a, b) => a.brand.localeCompare(b.brand));

  return {
    rows,
    toBuild: rows.filter((r) => r.action === "build").length,
    alreadyHaveList: rows.filter((r) => r.action === "already_has_list").length,
    noCosts: rows.filter((r) => r.action === "no_costs").length,
  };
}

export interface BuildOutcome {
  brandId: number;
  brand: string;
  ok: boolean;
  listId?: number;
  items?: number;
  /** items with no cost yet — the customer sees "price on request" */
  onRequest?: number;
  error?: string;
}

/**
 * Build one list per brand that has live costs and does not already have one.
 *
 * `publish` decides whether the lists go live immediately. Left off, they are
 * created as drafts, which is the safer default: a list must be published
 * before it can be assigned, so nothing reaches a customer by accident.
 */
export async function buildAllPriceLists(opts: {
  marginPercent: number;
  roundingMode?: RoundingMode;
  nameTemplate?: string;
  publish?: boolean;
  brandIds?: number[];
}): Promise<{ built: number; failed: number; results: BuildOutcome[] }> {
  const { rows } = await buildPreview();
  const wanted = opts.brandIds?.length ? new Set(opts.brandIds) : null;
  const targets = rows.filter((r) => r.action === "build" && (!wanted || wanted.has(r.brandId)));

  // "{brand}" is replaced; anything else is used as-is with the brand appended,
  // so a bad template can't produce 60 lists all called the same thing.
  const template = (opts.nameTemplate || "{brand} — standard").trim();
  const nameFor = (brand: string) =>
    template.includes("{brand}") ? template.replace("{brand}", brand) : `${template} ${brand}`;

  const results: BuildOutcome[] = [];
  for (const t of targets) {
    try {
      const built = await pricingV2.buildPriceList({
        brandId: t.brandId,
        name: nameFor(t.brand),
        defaultMarginPercent: opts.marginPercent,
        roundingMode: opts.roundingMode ?? "none",
      });
      if (opts.publish) {
        await pricingV2.updatePriceListMeta(built.list.id, { status: "published" });
      }
      results.push({
        brandId: t.brandId,
        brand: t.brand,
        ok: true,
        listId: built.list.id,
        items: built.itemCount,
        onRequest: (built as any).onRequestCount ?? 0,
      });
    } catch (e: any) {
      results.push({ brandId: t.brandId, brand: t.brand, ok: false, error: e?.message || String(e) });
    }
  }

  return {
    built: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}

// ---------------------------------------------------------------------------
// 2b. CHANGE THE MARGIN ON LISTS THAT ALREADY EXIST
// ---------------------------------------------------------------------------

export interface RepriceTarget {
  listId: number;
  name: string;
  brand: string | null;
  status: string;
  currentMargin: string | null;
  /** lines priced off the margin — these move */
  onMargin: number;
  /** lines set by hand (a fixed price or cost-plus) — these do NOT move */
  handSet: number;
  /** lines with no usable cost — nothing to reprice from */
  noCost: number;
}

/**
 * What a margin change would touch. Writes nothing.
 *
 * Step 2 deliberately refuses to rebuild a brand that already has a list,
 * because rebuilding throws away hand-set prices. Changing the margin is the
 * other thing people actually want, and it is a different operation: every
 * line still priced off the margin is recalculated, and every line someone
 * typed a price into is left exactly as it is.
 */
export async function repricePreview(opts: { listIds?: number[] } = {}): Promise<{
  targets: RepriceTarget[];
  lists: number;
  onMargin: number;
  handSet: number;
}> {
  const where = opts.listIds?.length
    ? and(isNotNull(priceLists.brandId), inArray(priceLists.id, opts.listIds))
    : and(isNotNull(priceLists.brandId), eq(priceLists.scope, "brand"));

  const lists = await db
    .select({
      id: priceLists.id,
      name: priceLists.name,
      status: priceLists.status,
      margin: priceLists.defaultMarginPercent,
      archivedAt: priceLists.archivedAt,
      brand: pricingBrands.name,
    })
    .from(priceLists)
    .leftJoin(pricingBrands, eq(pricingBrands.id, priceLists.brandId))
    .where(where);

  const live = lists.filter((l) => l.archivedAt == null);
  if (!live.length) return { targets: [], lists: 0, onMargin: 0, handSet: 0 };

  const rows = await db
    .select({
      listId: priceListItems.priceListId,
      method: priceListItems.method,
      costPrice: priceListItems.costPrice,
    })
    .from(priceListItems)
    .where(inArray(priceListItems.priceListId, live.map((l) => l.id)));

  const byList = new Map<number, { onMargin: number; handSet: number; noCost: number }>();
  for (const l of live) byList.set(l.id, { onMargin: 0, handSet: 0, noCost: 0 });
  for (const r of rows) {
    const bucket = byList.get(r.listId);
    if (!bucket) continue;
    if (r.method !== "margin") bucket.handSet++;
    else if (r.costPrice === null || Number(r.costPrice) <= 0) bucket.noCost++;
    else bucket.onMargin++;
  }

  const targets: RepriceTarget[] = live
    .map((l) => ({
      listId: l.id,
      name: l.name,
      brand: l.brand,
      status: l.status,
      currentMargin: l.margin,
      ...(byList.get(l.id) ?? { onMargin: 0, handSet: 0, noCost: 0 }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    targets,
    lists: targets.length,
    onMargin: targets.reduce((n, t) => n + t.onMargin, 0),
    handSet: targets.reduce((n, t) => n + t.handSet, 0),
  };
}

export interface RepriceOutcome {
  listId: number;
  name: string;
  ok: boolean;
  repriced?: number;
  untouched?: number;
  error?: string;
}

/**
 * Put a new margin on lists that already exist.
 *
 * Prices are computed by pricingV2.computePrepared — the same function the
 * builder and the per-line editor use, so a bulk change can never disagree
 * with a single-line one. Only the WRITE is batched: one statement per list
 * rather than one per line, because three thousand round trips is a request
 * that times out halfway and leaves half the catalogue on the old margin.
 */
export async function repriceLists(opts: {
  marginPercent: number;
  roundingMode?: RoundingMode;
  listIds?: number[];
}): Promise<{ lists: number; repriced: number; untouched: number; failed: number; results: RepriceOutcome[] }> {
  const margin = Number(opts.marginPercent);
  if (!Number.isFinite(margin) || margin < 0 || margin > 1000) {
    throw new Error("Margin must be a number between 0 and 1000.");
  }

  const { targets } = await repricePreview({ listIds: opts.listIds });
  const results: RepriceOutcome[] = [];

  for (const t of targets) {
    try {
      const items = await db
        .select({
          id: priceListItems.id,
          method: priceListItems.method,
          costPrice: priceListItems.costPrice,
          roundingMode: priceListItems.roundingMode,
        })
        .from(priceListItems)
        .where(eq(priceListItems.priceListId, t.listId));

      const moves: { id: number; price: number }[] = [];
      let untouched = 0;
      for (const it of items) {
        if (it.method !== "margin") {
          untouched++;
          continue;
        }
        const cost = it.costPrice === null ? null : Number(it.costPrice);
        const mode = (opts.roundingMode ?? (it.roundingMode as RoundingMode)) ?? "none";
        const price = pricingV2.computePrepared("margin", cost, margin, null, null, mode);
        if (price === null) {
          untouched++;
          continue;
        }
        moves.push({ id: it.id, price });
      }

      const modeSql = opts.roundingMode
        ? sql`${opts.roundingMode}`
        : sql`pli.rounding_mode`;

      for (let i = 0; i < moves.length; i += 500) {
        const chunk = moves.slice(i, i + 500);
        const values = sql.join(
          chunk.map((r) => sql`(${r.id}::int, ${r.price.toFixed(2)}::numeric)`),
          sql`, `,
        );
        await db.execute(sql`
          UPDATE price_list_items AS pli
             SET prepared_price = v.price,
                 margin_percent = ${margin.toFixed(2)}::numeric,
                 rounding_mode  = ${modeSql},
                 updated_at     = NOW()
            FROM (VALUES ${values}) AS v(id, price)
           WHERE pli.id = v.id
        `);
      }

      await pricingV2.updatePriceListMeta(t.listId, { defaultMarginPercent: margin });
      results.push({ listId: t.listId, name: t.name, ok: true, repriced: moves.length, untouched });
    } catch (e: any) {
      results.push({ listId: t.listId, name: t.name, ok: false, error: e?.message || String(e) });
    }
  }

  return {
    lists: results.filter((r) => r.ok).length,
    repriced: results.reduce((n, r) => n + (r.repriced ?? 0), 0),
    untouched: results.reduce((n, r) => n + (r.untouched ?? 0), 0),
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}

// ---------------------------------------------------------------------------
// 3. ASSIGN LISTS TO CUSTOMERS
// ---------------------------------------------------------------------------

export interface AssignOutcome {
  priceListId: number;
  list: string;
  assigned: number;
  conflicts: { customerId: number; existingListId: number }[];
  error?: string;
}

/**
 * Assign each chosen list to each chosen customer.
 *
 * Goes through assignCustomers per list, so the existing rule still holds: one
 * list per customer per brand. A customer already on a different list for that
 * brand comes back as a conflict rather than being silently moved — which is
 * what you want, because that customer is probably on a negotiated rate.
 */
export async function assignListsToCustomers(opts: {
  priceListIds: number[];
  customerIds: number[];
  replace?: boolean;
  assignedBy?: number | null;
}): Promise<{ assigned: number; conflicts: number; results: AssignOutcome[] }> {
  if (!opts.priceListIds.length || !opts.customerIds.length) {
    return { assigned: 0, conflicts: 0, results: [] };
  }

  const lists = await db
    .select({ id: priceLists.id, name: priceLists.name })
    .from(priceLists)
    .where(inArray(priceLists.id, opts.priceListIds));
  const nameById = new Map(lists.map((l) => [l.id, l.name]));

  const results: AssignOutcome[] = [];
  for (const id of opts.priceListIds) {
    const listName = nameById.get(id) ?? `#${id}`;
    try {
      const r = await pricingV2.assignCustomers(id, opts.customerIds, {
        replace: opts.replace,
        assignedBy: opts.assignedBy ?? null,
      });
      results.push({ priceListId: id, list: listName, assigned: r.assigned, conflicts: r.conflicts });
    } catch (e: any) {
      results.push({
        priceListId: id,
        list: listName,
        assigned: 0,
        conflicts: [],
        error: e?.message || String(e),
      });
    }
  }

  return {
    assigned: results.reduce((s, r) => s + r.assigned, 0),
    conflicts: results.reduce((s, r) => s + r.conflicts.length, 0),
    results,
  };
}
