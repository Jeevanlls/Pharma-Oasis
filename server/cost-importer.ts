// ============================================================
// Cost file importer — parses per-brand supplier price lists in the
// "BRAND / Category: X / EAN | Description | Case Size | Cost Price | QTY"
// format (xlsx or csv), then builds a matched preview with change% and
// guardrail flags. Pure parsing + preview; persistence lives in storage.ts.
// ============================================================
import * as XLSX from "xlsx";

export interface ParsedCostRow {
  ean: string;
  description: string;
  caseSize: string;
  costPrice: number | null;
  supplierQty: number | null;
  categoryName: string;
}

export interface ParsedFile {
  brandName: string | null;
  rows: ParsedCostRow[];
}

export interface PreviewRow extends ParsedCostRow {
  productId: number | null;
  // "matched" = EAN existed in the brand's prior published cost upload;
  // "new" = first time we've seen this EAN for the brand.
  matchStatus: "matched" | "new";
  previousCost: number | null;
  changePercent: number | null;
  flagged: boolean;
  flagReason: string;
}

/** A product that was in the brand's prior published cost upload but is absent
 *  from the file just uploaded (i.e. the supplier dropped it). */
export interface RemovedRow {
  ean: string;
  description: string;
  previousCost: number | null;
}

/** A row from the brand's prior published cost upload, used as the "previous cost"
 *  baseline. Kept deliberately loose so the route can pass cost_upload_rows directly. */
export interface PriorCostRow {
  ean: string | null;
  description?: string | null;
  costPrice: number | string | null;
  productId?: number | null;
}

export interface PreviewSummary {
  brandNameInFile: string | null;
  rows: PreviewRow[];
  removed: RemovedRow[];
  total: number;
  matched: number;
  /** brand-new EANs not seen in the prior published upload */
  newCount: number;
  removedCount: number;
  flagged: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const normEan = (v: string | null | undefined): string =>
  (v ?? "").toString().replace(/\s+/g, "").replace(/\.0$/, "").trim();

function parseMoney(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(v.toString().replace(/[£$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseQty(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = parseInt(v.toString().replace(/[,\s]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

type ColMap = { ean?: number; description?: number; caseSize?: number; costPrice?: number; supplierQty?: number };

function detectHeader(cells: string[]): ColMap | null {
  const map: ColMap = {};
  cells.forEach((cell, i) => {
    const c = cell.toLowerCase().trim();
    if (!c) return;
    if (map.ean === undefined && /(^|\b)(ean|barcode|gtin)\b/.test(c)) map.ean = i;
    else if (map.description === undefined && /desc|product|name|item/.test(c)) map.description = i;
    else if (map.caseSize === undefined && /case/.test(c)) map.caseSize = i;
    else if (map.costPrice === undefined && /cost|price/.test(c)) map.costPrice = i;
    else if (map.supplierQty === undefined && /qty|quant|stock/.test(c)) map.supplierQty = i;
  });
  // A real header has at least an EAN/barcode column plus a cost column.
  if (map.ean !== undefined && map.costPrice !== undefined) return map;
  return null;
}

/** Parse an uploaded buffer (xlsx or csv) into brand + product rows. */
export function parseCostFile(buffer: Buffer): ParsedFile {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { brandName: null, rows: [] };

  const matrix: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false,
  });

  let brandName: string | null = null;
  let currentCategory = "";
  let colMap: ColMap | null = null;
  const rows: ParsedCostRow[] = [];

  for (const rawRow of matrix) {
    const cells = (rawRow || []).map((c) => (c === null || c === undefined ? "" : c.toString().trim()));
    const firstText = cells.find((c) => c !== "") ?? "";
    if (!firstText) continue;

    const lower = firstText.toLowerCase();

    // Category section marker, e.g. "Category: Sports & Fitness"
    if (lower.startsWith("category")) {
      const idx = firstText.indexOf(":");
      currentCategory = idx >= 0 ? firstText.slice(idx + 1).trim() : firstText.replace(/category/i, "").trim();
      continue;
    }

    // Column header row
    const maybeHeader = detectHeader(cells);
    if (maybeHeader) {
      colMap = maybeHeader;
      continue;
    }

    // Data row (only once we know the columns)
    if (colMap && colMap.ean !== undefined) {
      const ean = normEan(cells[colMap.ean]);
      const costPrice = parseMoney(colMap.costPrice !== undefined ? cells[colMap.costPrice] : null);
      const description = colMap.description !== undefined ? cells[colMap.description] : "";
      // Skip empty filler rows
      if (!ean && !description && costPrice === null) continue;
      rows.push({
        ean,
        description,
        caseSize: colMap.caseSize !== undefined ? cells[colMap.caseSize] : "",
        costPrice,
        supplierQty: colMap.supplierQty !== undefined ? parseQty(cells[colMap.supplierQty]) : null,
        categoryName: currentCategory,
      });
      continue;
    }

    // Before any header/category, a lone text row is the brand name.
    if (!brandName && !colMap) brandName = firstText;
  }

  return { brandName, rows };
}

/**
 * Match parsed rows against the brand's PRIOR PUBLISHED cost upload (by EAN) and
 * flag problems. `priorRows` are the rows of the brand's latest published upload
 * (empty for the brand's first-ever upload).
 *
 * Note: this matches on the pricing-brand's own cost history — NOT the catalogue
 * `products` table. The catalogue `brands` and `pricing_brands` tables use
 * different id namespaces, so matching uploaded EANs against catalogue products
 * by brand id returned nothing and flagged every row "EAN not found".
 */
export function buildPreview(
  parsed: ParsedFile,
  priorRows: PriorCostRow[],
  thresholdPct: number,
): PreviewSummary {
  const priorByEan = new Map<string, PriorCostRow>();
  for (const p of priorRows) {
    const k = normEan(p.ean);
    if (k) priorByEan.set(k, p);
  }

  const seen = new Set<string>();
  const seenPriorEans = new Set<string>();
  const out: PreviewRow[] = [];

  for (const r of parsed.rows) {
    const key = normEan(r.ean);
    const prior = key ? priorByEan.get(key) : undefined;
    if (prior && key) seenPriorEans.add(key);
    const prevCost =
      prior?.costPrice != null && prior.costPrice !== "" ? Number(prior.costPrice) : null;

    let changePercent: number | null = null;
    if (prevCost !== null && prevCost > 0 && r.costPrice !== null) {
      changePercent = round2(((r.costPrice - prevCost) / prevCost) * 100);
    }

    const flags: string[] = [];
    if (r.costPrice === null || r.costPrice <= 0) flags.push("Cost is zero or blank");
    if (changePercent !== null && Math.abs(changePercent) > thresholdPct)
      flags.push(`Cost change ${changePercent > 0 ? "+" : ""}${changePercent}% exceeds ±${thresholdPct}%`);
    if (key && seen.has(key)) flags.push("Duplicate EAN in file");
    if (key) seen.add(key);

    out.push({
      ...r,
      description: r.description || prior?.description || "",
      productId: prior?.productId ?? null,
      matchStatus: prior ? "matched" : "new",
      previousCost: prevCost,
      changePercent,
      flagged: flags.length > 0,
      flagReason: flags.join("; "),
    });
  }

  // Products that were in the prior published upload but are absent from this file.
  const removed: RemovedRow[] = [];
  for (const [key, p] of Array.from(priorByEan.entries())) {
    if (seenPriorEans.has(key)) continue;
    removed.push({
      ean: p.ean ?? key,
      description: p.description ?? "",
      previousCost: p.costPrice != null && p.costPrice !== "" ? Number(p.costPrice) : null,
    });
  }

  return {
    brandNameInFile: parsed.brandName,
    rows: out,
    removed,
    total: out.length,
    matched: out.filter((r) => r.matchStatus === "matched").length,
    newCount: out.filter((r) => r.matchStatus === "new").length,
    removedCount: removed.length,
    flagged: out.filter((r) => r.flagged).length,
  };
}

/** Build the downloadable blank template workbook (xlsx). */
export function buildTemplateWorkbook(): Buffer {
  const aoa = [
    ["<BRAND NAME>"],
    ["Category: <CATEGORY NAME>"],
    ["EAN", "Description", "Case Size", "Cost Price", "QTY"],
    ["5060000000000", "Example Product 1kg", "12", "8.40", "100"],
    ["5060000000001", "Example Product 500g", "24", "4.95", "250"],
    ["Category: <ANOTHER CATEGORY (optional)>"],
    ["EAN", "Description", "Case Size", "Cost Price", "QTY"],
    ["5060000000002", "Another Example Item", "6", "12.00", "40"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 16 }, { wch: 32 }, { wch: 12 }, { wch: 12 }, { wch: 8 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cost Upload");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
