/**
 * PRICE MANAGER SYNC
 * ------------------
 * Mirrors supplier COST data out of RD's Price Manager (Supabase) into this
 * portal's Customer Pricing section.
 *
 * The boundary matters: Price Manager owns what we BUY at. This app owns what
 * the customer PAYS. Nothing in here sets a customer price — it only lands cost
 * rows as DRAFT cost uploads. A human reviews and publishes them in
 * /admin/cost-uploads exactly as if they had uploaded a spreadsheet, and the
 * margin that turns cost into a selling price is applied in the Price Builder.
 *
 * Deliberately reuses the existing pipeline rather than duplicating it:
 *   analyzeRows()      — the same validation engine the CSV upload uses
 *                        (duplicate EANs, missing info, change %, dropped lines)
 *   createDraftUpload() — the same draft-writing path
 * so a synced upload is indistinguishable from a hand-uploaded one downstream.
 *
 * Connection: PM_DATABASE_URL (read-only role). Absent -> every entry point
 * fails with a clear message rather than half-running.
 */
import pg from "pg";
import { eq, and, like, inArray } from "drizzle-orm";
import { db } from "./db";
import { pricingBrands, costUploads } from "@shared/schema";
import { analyzeRows, type ParsedCostRow } from "./cost-importer";
import { createDraftUpload } from "./pricing-store";
import { ensurePricingCategory, getBaseCostForBrand } from "./pricing-v2";

const { Pool } = pg;

/** Marks every upload this module creates, so runs are traceable and re-runs
 *  can tell "already waiting for review" from "genuinely new". */
export const PM_SYNC_FILE_NAME = "price-manager-sync";
const PM_SUPPLIER_NAME = "Price Manager";

/** Cost change beyond this % is flagged for explicit confirmation before publish. */
const DEFAULT_THRESHOLD_PCT = 20;

let pmPool: pg.Pool | null = null;

/** Lazily open the Price Manager pool. Small — this runs nightly, not per request. */
function getPmPool(): pg.Pool {
  if (pmPool) return pmPool;
  let url = process.env.PM_DATABASE_URL;
  if (!url) {
    throw new Error(
      "PM_DATABASE_URL is not set. Add the Price Manager read-only connection string " +
        "in Render → Environment before running a sync.",
    );
  }
  // Neon/Supabase strings are sometimes pasted with a psql prefix or the
  // channel_binding option, both of which break node-postgres.
  if (url.startsWith("psql ")) url = url.replace(/^psql\s+'?/, "").replace(/'$/, "");
  url = url.replace(/&?channel_binding=require/, "");
  pmPool = new Pool({
    connectionString: url,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  });
  return pmPool;
}

export interface PmBrandRow {
  /** Price Manager is a Supabase project — its ids are UUID strings, not numbers. */
  id: string;
  name: string;
  category: string | null;
  active: boolean | null;
}

export interface PmProductRow {
  id: string;
  brand_id: string;
  name: string | null;
  ean: string | null;
  case_size: string | null;
  cost_price: string | number | null;
  active: boolean | null;
}

/** One read of Price Manager. pm_products has no updated_at, so there is no way
 *  to ask "what changed" — we always take the full set and diff it here. At
 *  ~6k rows that is around a megabyte and a second or two. */
export async function readPriceManager(): Promise<{ brands: PmBrandRow[]; products: PmProductRow[] }> {
  const pool = getPmPool();
  const client = await pool.connect();
  try {
    const brands = await client.query<PmBrandRow>(
      `select id, name, category, active from pm_brands order by name`,
    );
    const products = await client.query<PmProductRow>(
      `select id, brand_id, name, ean, case_size, cost_price, active
         from pm_products
        where active is true
        order by brand_id, id`,
    );
    return { brands: brands.rows, products: products.rows };
  } finally {
    client.release();
  }
}

/** Connectivity check for the admin screen — never throws, always reports. */
export async function pmSyncHealth(): Promise<{
  configured: boolean;
  reachable: boolean;
  brands?: number;
  products?: number;
  error?: string;
}> {
  if (!process.env.PM_DATABASE_URL) return { configured: false, reachable: false };
  try {
    const { brands, products } = await readPriceManager();
    return { configured: true, reachable: true, brands: brands.length, products: products.length };
  } catch (e: any) {
    return { configured: true, reachable: false, error: e?.message || String(e) };
  }
}

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
const numOrNull = (v: string | number | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Resolve a Price Manager brand to one of our pricing brands.
 *
 * Matching is by Price Manager brand id FIRST and name only as a fallback.
 * That ordering is the whole point: RD renames brands during his clean-up, and
 * a name-only match would quietly create a second brand, leaving the first one
 * holding the price list and the customers while the new costs landed in the
 * new one. Nothing would error; the two would just drift apart.
 *
 * Three cases:
 *   - known id     -> that brand, and its name is corrected if RD renamed it
 *   - known name   -> that brand, and it ADOPTS the id so this is the last time
 *                     we ever have to match it by name
 *   - neither      -> a new brand, stamped with the id
 *
 * `write` is false on a dry run, where the answer is reported but nothing is
 * created, adopted or renamed.
 */
interface BrandResolution {
  id: number | null;
  created: boolean;
  /** RD renamed it upstream and we followed */
  renamedFrom?: string;
  /** matched by name and took the id for the first time */
  adopted?: boolean;
  /** the rename could not be applied because another brand already has that name */
  renameBlocked?: string;
}

async function resolvePricingBrand(
  pm: PmBrandRow,
  existing: (typeof pricingBrands.$inferSelect)[],
  write: boolean,
): Promise<BrandResolution> {
  const clean = pm.name.trim();

  const byId = existing.find((b) => b.pmBrandId === pm.id);
  if (byId) {
    if (norm(byId.name) === norm(clean)) return { id: byId.id, created: false };
    // Renamed upstream. Follow it — unless the new name is already taken here,
    // in which case renaming would violate the unique name and, worse, silently
    // merge two brands. Leave it alone and say so.
    const clash = existing.find((b) => b.id !== byId.id && norm(b.name) === norm(clean));
    if (clash) {
      return { id: byId.id, created: false, renameBlocked: `${byId.name} -> ${clean}` };
    }
    if (write) {
      await db
        .update(pricingBrands)
        .set({ name: clean, updatedAt: new Date() })
        .where(eq(pricingBrands.id, byId.id));
    }
    return { id: byId.id, created: false, renamedFrom: byId.name };
  }

  const byName = existing.find((b) => norm(b.name) === norm(clean));
  if (byName) {
    if (write && byName.pmBrandId == null) {
      await db
        .update(pricingBrands)
        .set({ pmBrandId: pm.id, updatedAt: new Date() })
        .where(eq(pricingBrands.id, byName.id));
    }
    return { id: byName.id, created: false, adopted: byName.pmBrandId == null };
  }

  if (!write) return { id: null, created: true };

  const [made] = await db
    .insert(pricingBrands)
    .values({
      name: clean,
      slug: clean.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      pmBrandId: pm.id,
      isActive: true,
    })
    .returning();
  return { id: made.id, created: true };
}

export interface PmSyncBrandResult {
  pmBrandId: string;
  brand: string;
  category: string | null;
  pricingBrandId: number | null;
  brandCreated: boolean;
  lines: number;
  /** lines Price Manager holds with no EAN — these cannot be published yet */
  noEan: number;
  newCount: number;
  changedCount: number;
  removedCount: number;
  unchangedCount: number;
  duplicateCount: number;
  /** RD renamed this brand upstream and we followed */
  renamedFrom?: string;
  /** matched by name and took the Price Manager id for the first time */
  adopted?: boolean;
  /** the upstream rename could not be applied - another brand already has that name */
  renameBlocked?: string;
  /** a draft was raised for this brand (or would be, on a dry run) */
  draftRaised: boolean;
  draftUploadId?: number;
  /** set when nothing was done and why */
  skipped?: string;
}

export interface PmSyncResult {
  ranAt: string;
  dryRun: boolean;
  pmBrands: number;
  pmProducts: number;
  brandsWithChanges: number;
  draftsRaised: number;
  totalNew: number;
  totalChanged: number;
  totalRemoved: number;
  totalNoEan: number;
  brandsCreated: string[];
  /** brands RD renamed upstream that we followed, "old -> new" */
  brandsRenamed: string[];
  categoriesSeen: string[];
  results: PmSyncBrandResult[];
}

/**
 * Read Price Manager, diff every brand against its latest published costs here,
 * and raise a DRAFT cost upload for each brand that moved.
 *
 * Nothing a customer can see changes. Drafts wait in /admin/cost-uploads.
 */
export async function runPmSync(opts: {
  dryRun?: boolean;
  uploadedBy?: number | null;
  thresholdPct?: number;
} = {}): Promise<PmSyncResult> {
  const dryRun = opts.dryRun ?? false;
  const threshold = opts.thresholdPct ?? DEFAULT_THRESHOLD_PCT;
  const { brands, products } = await readPriceManager();

  // Brands that already have a sync draft awaiting review are left alone, so a
  // second run never stacks duplicate drafts on top of an unreviewed one.
  const openDrafts = await db
    .select({ id: costUploads.id, brandId: costUploads.brandId })
    .from(costUploads)
    .where(and(eq(costUploads.status, "draft"), like(costUploads.fileName, `${PM_SYNC_FILE_NAME}%`)));
  const brandsWithOpenDraft = new Set(openDrafts.map((d) => d.brandId));

  const byBrand = new Map<string, PmProductRow[]>();
  for (const p of products) {
    const list = byBrand.get(p.brand_id);
    if (list) list.push(p);
    else byBrand.set(p.brand_id, [p]);
  }

  // Read our brands once. The loop does up to a few hundred lookups and this
  // table is small; re-selecting per brand was pure waste.
  const existingBrands = await db.select().from(pricingBrands);

  const results: PmSyncBrandResult[] = [];
  const brandsCreated: string[] = [];
  const renamed: string[] = [];
  const categoriesSeen = new Set<string>();

  for (const b of brands) {
    const items = byBrand.get(b.id) ?? [];
    if (!items.length) {
      results.push({
        pmBrandId: b.id, brand: b.name, category: b.category, pricingBrandId: null,
        brandCreated: false, lines: 0, noEan: 0, newCount: 0, changedCount: 0,
        removedCount: 0, unchangedCount: 0, duplicateCount: 0, draftRaised: false,
        skipped: "no active products in Price Manager",
      });
      continue;
    }

    // A dry run must write NOTHING — not even a brand or category row. If the
    // brand does not exist here yet then it has no prior costs and no open
    // draft, so a null id answers both of those questions correctly and we can
    // still report exactly what a real run would do.
    const resolved = await resolvePricingBrand(b, existingBrands, !dryRun);
    const pricingBrandId = resolved.id;
    const created = resolved.created;
    if (created) brandsCreated.push(b.name);
    if (resolved.renamedFrom) renamed.push(`${resolved.renamedFrom} -> ${b.name}`);
    if (!dryRun && b.category) await ensurePricingCategory(b.category);
    if (b.category) categoriesSeen.add(b.category);

    const rows: ParsedCostRow[] = items.map((p) => ({
      ean: (p.ean ?? "").trim(),
      description: (p.name ?? "").trim(),
      caseSize: (p.case_size ?? "").trim(),
      costPrice: numOrNull(p.cost_price),
      supplierQty: null, // Price Manager holds no stock quantity
      categoryName: b.category ?? "",
      comment: null,
    }));

    const noEan = rows.filter((r) => !r.ean).length;
    const prior = pricingBrandId === null ? null : await getBaseCostForBrand(pricingBrandId);
    const summary = analyzeRows(rows, prior?.rows ?? [], threshold);

    const moved = summary.newCount + summary.changedCount + summary.removedCount;
    const base: PmSyncBrandResult = {
      pmBrandId: b.id,
      brand: b.name,
      category: b.category,
      pricingBrandId,
      brandCreated: created,
      renamedFrom: resolved.renamedFrom,
      adopted: resolved.adopted,
      renameBlocked: resolved.renameBlocked,
      lines: rows.length,
      noEan,
      newCount: summary.newCount,
      changedCount: summary.changedCount,
      removedCount: summary.removedCount,
      unchangedCount: summary.okCount,
      duplicateCount: summary.duplicateCount,
      draftRaised: false,
    };

    if (pricingBrandId !== null && brandsWithOpenDraft.has(pricingBrandId)) {
      results.push({ ...base, skipped: "a sync draft for this brand is already awaiting review" });
      continue;
    }
    if (!moved) {
      results.push({ ...base, skipped: "no cost changes" });
      continue;
    }
    if (dryRun) {
      results.push({ ...base, draftRaised: true });
      continue;
    }

    const upload = await createDraftUpload({
      brandId: pricingBrandId as number,
      supplierName: PM_SUPPLIER_NAME,
      comment:
        `Automatic sync from Price Manager — ${summary.newCount} new, ` +
        `${summary.changedCount} cost changes, ${summary.removedCount} dropped by supplier.` +
        (noEan ? ` ${noEan} line(s) have no EAN and cannot be published yet.` : ""),
      fileName: `${PM_SYNC_FILE_NAME}-${new Date().toISOString().slice(0, 10)}`,
      uploadedBy: opts.uploadedBy ?? null,
      rows: summary.rows,
    });

    results.push({ ...base, draftRaised: true, draftUploadId: upload.id });
  }

  return {
    ranAt: new Date().toISOString(),
    dryRun,
    pmBrands: brands.length,
    pmProducts: products.length,
    brandsWithChanges: results.filter((r) => r.draftRaised).length,
    draftsRaised: results.filter((r) => r.draftRaised && r.draftUploadId).length,
    totalNew: results.reduce((s, r) => s + r.newCount, 0),
    totalChanged: results.reduce((s, r) => s + r.changedCount, 0),
    totalRemoved: results.reduce((s, r) => s + r.removedCount, 0),
    totalNoEan: results.reduce((s, r) => s + r.noEan, 0),
    brandsCreated,
    brandsRenamed: renamed,
    categoriesSeen: Array.from(categoriesSeen).sort(),
    results: results.sort((a, b) => b.lines - a.lines),
  };
}

/** Lines Price Manager cannot price yet, for the report back to RD. */
export async function pmNoEanReport(): Promise<
  { brand: string; category: string | null; lines: number }[]
> {
  const { brands, products } = await readPriceManager();
  const nameById = new Map(brands.map((b) => [b.id, b]));
  const counts = new Map<number, number>();
  for (const p of products) {
    if ((p.ean ?? "").trim()) continue;
    counts.set(p.brand_id, (counts.get(p.brand_id) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([brandId, lines]) => ({
      brand: nameById.get(brandId)?.name ?? `#${brandId}`,
      category: nameById.get(brandId)?.category ?? null,
      lines,
    }))
    .sort((a, b) => b.lines - a.lines);
}
