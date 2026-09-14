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
import { and, eq, inArray, like, isNotNull } from "drizzle-orm";
import { db } from "./db";
import { costUploads, priceLists, pricingBrands } from "@shared/schema";
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
  error?: string;
}

/**
 * Publish the waiting drafts.
 *
 * One failure does not stop the run: a brand with duplicate barcodes throws
 * inside publishUpload, and the right answer is to publish the other 59 and
 * report that one, not to abandon the lot halfway through.
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
