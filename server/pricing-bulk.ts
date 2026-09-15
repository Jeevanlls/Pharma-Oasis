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
import { and, desc, eq, inArray, isNull, like, isNotNull, sql } from "drizzle-orm";
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
  // A negotiated list belongs to one customer and to no rate card. A bulk
  // reprice must never reach one by accident, so it is only ever included when
  // its id is named — which is what rate-cards.ts does when the deal itself is
  // renegotiated.
  const where = opts.listIds?.length
    ? and(isNotNull(priceLists.brandId), inArray(priceLists.id, opts.listIds))
    : and(
        isNotNull(priceLists.brandId),
        eq(priceLists.scope, "brand"),
        isNull(priceLists.exceptionCustomerId),
      );

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
// 0b. THE DAILY RUN — CARRY NEW SUPPLIER COSTS THROUGH TO CUSTOMER PRICES
// ---------------------------------------------------------------------------

/**
 * A price list stores the cost it was built from. That snapshot is deliberate:
 * a customer's price must not move because someone was mid-edit in Price
 * Manager. It also means a published cost does NOT reach a customer by itself —
 * something has to carry it across, and that something is this.
 *
 * A list is stale when its stored base cost is not the brand's newest published
 * one. Only stale lists are looked at or touched, which is what keeps a daily
 * run proportional to what actually changed rather than to the catalogue.
 */
export interface StaleList {
  listId: number;
  name: string;
  brandId: number;
  brand: string | null;
  fromUploadId: number | null;
  toUploadId: number;
}

async function findStaleLists(listIds?: number[]): Promise<StaleList[]> {
  const lists = await db
    .select({
      id: priceLists.id,
      name: priceLists.name,
      brandId: priceLists.brandId,
      baseCostUploadId: priceLists.baseCostUploadId,
      brand: pricingBrands.name,
    })
    .from(priceLists)
    .leftJoin(pricingBrands, eq(pricingBrands.id, priceLists.brandId))
    .where(
      and(
        eq(priceLists.scope, "brand"),
        eq(priceLists.status, "published"),
        isNotNull(priceLists.brandId),
        isNull(priceLists.archivedAt),
      ),
    );

  const wanted = listIds?.length ? new Set(listIds) : null;
  const uploads = await db
    .select({ id: costUploads.id, brandId: costUploads.brandId, publishedAt: costUploads.publishedAt })
    .from(costUploads)
    .where(eq(costUploads.status, "published"))
    .orderBy(desc(costUploads.publishedAt));

  const latestByBrand = new Map<number, number>();
  for (const u of uploads) {
    if (u.brandId != null && !latestByBrand.has(u.brandId)) latestByBrand.set(u.brandId, u.id);
  }

  const stale: StaleList[] = [];
  for (const l of lists) {
    if (wanted && !wanted.has(l.id)) continue;
    if (l.brandId == null) continue;
    const latest = latestByBrand.get(l.brandId);
    if (latest == null || latest === l.baseCostUploadId) continue;
    stale.push({
      listId: l.id,
      name: l.name,
      brandId: l.brandId,
      brand: l.brand,
      fromUploadId: l.baseCostUploadId,
      toUploadId: latest,
    });
  }
  stale.sort((a, b) => a.name.localeCompare(b.name));
  return stale;
}

export interface RefreshBrandPreview {
  listId: number;
  name: string;
  brand: string | null;
  changed: number;
  up: number;
  down: number;
  unchanged: number;
  newProducts: number;
  missing: number;
  /** hand-set prices that will NOT move — the cost moved under them */
  handSet: number;
  /** cost moves beyond BIG_CHANGE_PCT, worth a look before applying */
  bigMovers: {
    ean: string | null;
    description: string | null;
    oldCost: number | null;
    newCost: number | null;
    changePercent: number | null;
  }[];
}

/**
 * What today's costs would do to customer prices. Writes nothing.
 *
 * Reuses pricingV2.reconcilePreview per list, the same comparison the
 * single-brand review screen shows, so the bulk number and the per-brand
 * detail can never tell different stories.
 */
export async function refreshPreview(opts: { listIds?: number[] } = {}): Promise<{
  stale: number;
  changed: number;
  up: number;
  down: number;
  newProducts: number;
  missing: number;
  handSet: number;
  bigMovers: number;
  brands: RefreshBrandPreview[];
}> {
  const stale = await findStaleLists(opts.listIds);
  const brands: RefreshBrandPreview[] = [];

  for (const s of stale) {
    const r = await pricingV2.reconcilePreview(s.listId);
    if (!r.hasBaseCost) continue;
    const movers = r.changed.filter((c) => c.big);
    brands.push({
      listId: s.listId,
      name: s.name,
      brand: s.brand,
      changed: r.changed.length,
      up: r.changed.filter((c) => (c.changePercent ?? 0) > 0).length,
      down: r.changed.filter((c) => (c.changePercent ?? 0) < 0).length,
      unchanged: r.unchangedCount,
      newProducts: r.newProducts.length,
      missing: r.missing.length,
      handSet: r.changed.filter((c) => c.method === "fixed").length,
      bigMovers: movers.slice(0, 10).map((c) => ({
        ean: c.ean,
        description: c.description,
        oldCost: c.oldCost,
        newCost: c.newCost,
        changePercent: c.changePercent,
      })),
    });
  }

  const sum = (f: (b: RefreshBrandPreview) => number) => brands.reduce((n, b) => n + f(b), 0);
  return {
    stale: brands.length,
    changed: sum((b) => b.changed),
    up: sum((b) => b.up),
    down: sum((b) => b.down),
    newProducts: sum((b) => b.newProducts),
    missing: sum((b) => b.missing),
    handSet: sum((b) => b.handSet),
    bigMovers: sum((b) => b.bigMovers.length),
    brands,
  };
}

export interface RefreshOutcome {
  listId: number;
  name: string;
  ok: boolean;
  updated?: number;
  /** products in the supplier file that were not on the list, now added */
  added?: number;
  /** hand-set prices whose cost moved — margin unchanged, worth a look */
  fixedToReview?: number;
  error?: string;
}

/**
 * Carry the new costs into customer prices, one stale list at a time.
 *
 * Each list goes through pricingV2.refreshFromBaseCost — the same function the
 * per-brand refresh button calls. A hand-set price keeps its value and is only
 * reported; a line whose cost vanished becomes "price on request" rather than
 * disappearing, so the customer can still ask.
 */
export async function refreshAllLists(opts: {
  listIds?: number[];
  /** false to leave products the list does not yet carry alone (default: add them) */
  addNew?: boolean;
} = {}): Promise<{
  lists: number;
  updated: number;
  added: number;
  fixedToReview: number;
  failed: number;
  results: RefreshOutcome[];
}> {
  const stale = await findStaleLists(opts.listIds);
  const addNew = opts.addNew !== false;
  const results: RefreshOutcome[] = [];

  for (const s of stale) {
    try {
      // Two passes, each using the function that is right for its half.
      // refreshFromBaseCost handles existing lines, including the case where a
      // cost has vanished (the line becomes "price on request" rather than
      // disappearing). reconcileApply is the only thing that can add a product
      // the list does not carry yet, so new lines go through that — and only
      // new lines: nothing is deleted here, a line that has left the supplier
      // file keeps its last price until someone decides otherwise.
      const r = await pricingV2.refreshFromBaseCost(s.listId);
      let added = 0;
      if (addNew) {
        const pre = await pricingV2.reconcilePreview(s.listId);
        const eans = pre.newProducts.map((n) => n.ean).filter((e): e is string => !!e);
        if (eans.length) {
          const applied = await pricingV2.reconcileApply(s.listId, {
            applyChangedItemIds: [],
            addNewEans: eans,
            removeMissingItemIds: [],
          });
          added = applied.added;
        }
      }
      results.push({ listId: s.listId, name: s.name, ok: true, added, ...r });
    } catch (e: any) {
      results.push({ listId: s.listId, name: s.name, ok: false, error: e?.message || String(e) });
    }
  }

  return {
    lists: results.filter((r) => r.ok).length,
    updated: results.reduce((n, r) => n + (r.updated ?? 0), 0),
    added: results.reduce((n, r) => n + (r.added ?? 0), 0),
    fixedToReview: results.reduce((n, r) => n + (r.fixedToReview ?? 0), 0),
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}

// ---------------------------------------------------------------------------
// 0. WHERE DOES THE WHOLE THING STAND?
// ---------------------------------------------------------------------------

export interface GoLiveTodo {
  /** stable key so the page can attach the right button */
  key:
    | "blocked_costs"
    | "no_costs"
    | "drafts_waiting"
    | "lists_to_build"
    | "customers_unassigned"
    | "customers_no_login"
    | "customers_no_email"
    | "customers_duplicate_email"
    | "costs_not_applied";
  /** one sentence, already counted, written for someone who did not build this */
  text: string;
  detail?: string;
  count: number;
  severity: "blocked" | "waiting" | "todo";
}

export interface GoLiveState {
  /** true when at least one customer can see at least one price */
  live: boolean;
  headline: string;
  brandsPriced: number;
  pricesLive: number;
  customersSeeing: number;
  margins: string[];
  steps: {
    costs: { done: number; total: number; blocked: number; drafts: number };
    lists: { built: number; toBuild: number; noCosts: number };
    customers: { withLists: number; total: number };
  };
  /** the daily loop: costs that have moved but have not reached customers yet */
  daily: { staleLists: number; pricesWaiting: number; bigMovers: number };
  todo: GoLiveTodo[];
}

/**
 * Everything the Go live page needs, in one call, as sentences rather than
 * numbers waiting to be interpreted.
 *
 * The page used to show four equal cards of dense prose whether or not there
 * was anything to do in them, so "am I live?" and "what is stuck?" — the only
 * two questions anyone actually opens this page with — were the two things it
 * did not answer. This answers them first and lets the steps collapse.
 *
 * Writes nothing.
 */
export async function goLiveState(): Promise<GoLiveState> {
  const [drafts, blockers, build, reprice, refresh] = await Promise.all([
    publishPreview(),
    publishBlockers(),
    buildPreview(),
    repricePreview(),
    refreshPreview(),
  ]);

  const assigned = await db
    .selectDistinct({ customerId: customerPriceLists.customerId })
    .from(customerPriceLists);

  let invites: {
    readyReal: number;
    testLike: number;
    noEmail: number;
    duplicateEmail: number;
  } | null = null;
  try {
    const { customerSyncPreview } = await import("./customer-sync");
    const p = await customerSyncPreview();
    invites = {
      readyReal: p.readyReal,
      testLike: p.testLike,
      noEmail: p.noEmail,
      duplicateEmail: p.duplicateEmail,
    };
  } catch {
    // The inventory database is optional here — the pricing half of this page
    // must still work when it cannot be reached.
    invites = null;
  }

  const margins = Array.from(
    new Set(reprice.targets.map((t) => t.currentMargin ?? "—")),
  ).sort();

  const brandsPriced = reprice.lists;
  const pricesLive = reprice.onMargin + reprice.handSet;
  const customersSeeing = assigned.length;
  const live = brandsPriced > 0 && customersSeeing > 0;

  const todo: GoLiveTodo[] = [];

  const moving = refresh.changed + refresh.newProducts;
  if (refresh.stale > 0 && moving > 0) {
    const bits: string[] = [];
    if (refresh.changed) bits.push(`${refresh.changed} price${refresh.changed === 1 ? "" : "s"} changed`);
    if (refresh.newProducts) bits.push(`${refresh.newProducts} new product${refresh.newProducts === 1 ? "" : "s"}`);
    todo.push({
      key: "costs_not_applied",
      count: moving,
      severity: "todo",
      text: `${bits.join(" and ")} across ${refresh.stale} brand${refresh.stale === 1 ? "" : "s"}, not yet sent to customers`,
      detail: [
        refresh.changed ? `${refresh.up} up, ${refresh.down} down` : "",
        refresh.bigMovers ? `${refresh.bigMovers} moved more than 25%` : "",
        refresh.missing ? `${refresh.missing} line(s) have left the supplier file and will keep their last price` : "",
      ].filter(Boolean).join(" · "),
    });
  }

  if (blockers.blocked.length) {
    todo.push({
      key: "blocked_costs",
      count: blockers.blocked.length,
      severity: "blocked",
      text: `${blockers.blocked.length} brand${blockers.blocked.length === 1 ? "" : "s"} cannot be priced`,
      detail:
        blockers.blocked.map((b) => b.brand).join(" and ") +
        ` — the cost file lists the same barcode twice at two different prices, so there is no way to tell which is right. This has to be fixed in Price Manager.`,
    });
  }

  const plainDrafts = drafts.drafts.length - blockers.blocked.length;
  if (plainDrafts > 0) {
    todo.push({
      key: "drafts_waiting",
      count: plainDrafts,
      severity: "todo",
      text: `${plainDrafts} brand${plainDrafts === 1 ? "" : "s"} ha${plainDrafts === 1 ? "s" : "ve"} new costs waiting`,
      detail: "New buying prices came in from Price Manager. Publishing makes them the live cost; no customer price changes until a list is built from them.",
    });
  }

  if (build.toBuild > 0) {
    todo.push({
      key: "lists_to_build",
      count: build.toBuild,
      severity: "todo",
      text: `${build.toBuild} brand${build.toBuild === 1 ? "" : "s"} ha${build.toBuild === 1 ? "s" : "ve"} costs but no price list`,
      detail: "Customers cannot see a brand until it has a price list.",
    });
  }

  if (build.noCosts > 0) {
    todo.push({
      key: "no_costs",
      count: build.noCosts,
      severity: "waiting",
      text: `${build.noCosts} brands are waiting on a buying price`,
      detail: "Nothing to do here until Price Manager has a cost for them. Usually these are the lines with no barcode.",
    });
  }

  if (invites) {
    if (invites.readyReal > 0) {
      todo.push({
        key: "customers_no_login",
        count: invites.readyReal,
        severity: "todo",
        text: `${invites.readyReal} customers have no login yet`,
        detail: "They are approved in the inventory app but cannot sign in here. Inviting emails them a link to set their own password.",
      });
    }
    if (invites.noEmail > 0) {
      todo.push({
        key: "customers_no_email",
        count: invites.noEmail,
        severity: "waiting",
        text: `${invites.noEmail} customers have no email address`,
        detail: "Add one in the inventory app and they will appear here on the next check.",
      });
    }
    if (invites.duplicateEmail > 0) {
      todo.push({
        key: "customers_duplicate_email",
        count: invites.duplicateEmail,
        severity: "waiting",
        text: `${invites.duplicateEmail} customers share an email address with another customer`,
        detail: "One address cannot be two logins. Fix it in the inventory app.",
      });
    }
  }

  const dailyBlock = {
    staleLists: refresh.stale,
    pricesWaiting: refresh.changed + refresh.newProducts,
    bigMovers: refresh.bigMovers,
  };

  const headline = !brandsPriced
    ? "Nothing is priced yet."
    : !customersSeeing
      ? `${brandsPriced} brands are priced, but no customer has been given a list yet.`
      : refresh.changed + refresh.newProducts > 0
        ? `Live, with ${(refresh.changed + refresh.newProducts).toLocaleString()} update${refresh.changed + refresh.newProducts === 1 ? "" : "s"} waiting to go out.`
        : `Live and up to date.`;

  return {
    live,
    headline,
    brandsPriced,
    pricesLive,
    customersSeeing,
    margins,
    steps: {
      costs: {
        done: build.alreadyHaveList + build.toBuild,
        total: build.rows.length,
        blocked: blockers.blocked.length,
        drafts: drafts.drafts.length,
      },
      lists: { built: build.alreadyHaveList, toBuild: build.toBuild, noCosts: build.noCosts },
      customers: { withLists: customersSeeing, total: customersSeeing },
    },
    daily: dailyBlock,
    todo,
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
