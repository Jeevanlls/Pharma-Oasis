/**
 * BRAND REPORT — the complete brand list, straight from the inventory database
 * ---------------------------------------------------------------------------
 * RD is de-duplicating brand names before loading them into Price Manager. He
 * had been reading them through the inventory app's brand search endpoint,
 * which returns only the top 25 matches per search ordered by product count —
 * so anything with few products was invisible to him, and the duplicates he
 * found were skewed towards the big brands.
 *
 * This app already holds a read-only connection to the inventory database, so
 * it can answer the question properly: every distinct brand spelling, with its
 * product count, in one pass.
 *
 * It also settles a second question. Several brands (L'Oreal, Lancome, Hermes,
 * Estee Lauder and friends) reach RD with one character mangled, and from
 * outside you cannot tell whether the database holds a correct accented letter
 * or a broken byte. The hex of each name is included, so the bytes speak for
 * themselves.
 *
 * Strictly read-only. No UPDATE, no DELETE, no DDL — the renames are RD's
 * step 3 and are not run from here.
 */
import { getInventoryPool } from "./customer-sync";

export interface BrandRow {
  brand_as_stored: string;
  product_count: number;
  brand_hex: string;
  char_length: number;
  byte_length: number;
  example_product: string | null;
}

/** RD's step-1 query, unchanged in substance. */
const BRAND_SQL = `
  SELECT brand                                    AS brand_as_stored,
         COUNT(*)::int                            AS product_count,
         encode(convert_to(brand, 'UTF8'), 'hex') AS brand_hex,
         length(brand)                            AS char_length,
         octet_length(brand)                      AS byte_length,
         MIN(name)                                AS example_product
    FROM products
   WHERE brand IS NOT NULL
     AND btrim(brand) <> ''
   GROUP BY brand
   ORDER BY COUNT(*) DESC, brand`;

const NO_BRAND_SQL = `
  SELECT COUNT(*)::int AS products_with_no_brand
    FROM products
   WHERE brand IS NULL OR btrim(brand) = ''`;

export async function readBrandReport(): Promise<{
  rows: BrandRow[];
  productsWithNoBrand: number;
}> {
  const client = await getInventoryPool().connect();
  try {
    const brands = await client.query<BrandRow>(BRAND_SQL);
    const blank = await client.query<{ products_with_no_brand: number }>(NO_BRAND_SQL);
    return {
      rows: brands.rows,
      productsWithNoBrand: blank.rows[0]?.products_with_no_brand ?? 0,
    };
  } finally {
    client.release();
  }
}

/** RFC 4180: quote everything, double any embedded quote. Brand names contain
 *  commas, apostrophes and the odd stray quote, and this file goes to someone
 *  else's spreadsheet — so no clever minimal quoting. */
function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export function brandReportCsv(rows: BrandRow[]): string {
  const header = [
    "brand_as_stored",
    "product_count",
    "brand_hex",
    "char_length",
    "byte_length",
    "example_product",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.brand_as_stored,
        r.product_count,
        r.brand_hex,
        r.char_length,
        r.byte_length,
        r.example_product,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  // Excel opens a BOM-prefixed file as UTF-8; without it, accented brand names
  // look broken on the way in and the whole point of the exercise is lost.
  return "\ufeff" + lines.join("\r\n") + "\r\n";
}

export interface BrandFlag {
  brand: string;
  productCount: number;
  hex: string;
  reason: string;
}

export interface NearDuplicate {
  normalised: string;
  spellings: { brand: string; productCount: number }[];
  totalProducts: number;
}

export interface BrandReportSummary {
  ranAt: string;
  distinctSpellings: number;
  productsWithABrand: number;
  productsWithNoBrand: number;
  /** names whose bytes are not plain ASCII — the accent question, answered */
  nonAscii: BrandFlag[];
  /** names containing the Unicode replacement character: genuinely corrupted */
  corrupted: BrandFlag[];
  /** spellings that collapse to the same name once case, spacing and
   *  punctuation are ignored — the safe end of RD's merge list */
  nearDuplicates: NearDuplicate[];
  /** how many spellings sit below the 25-per-search cut-off RD was hitting */
  spellingsUnder60Products: number;
}

/** Lower-case, collapse whitespace, drop punctuation. Deliberately blunt: this
 *  is a shortlist for a human to approve, not an automatic merge. */
const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export async function brandReportSummary(): Promise<BrandReportSummary> {
  const { rows, productsWithNoBrand } = await readBrandReport();

  const nonAscii: BrandFlag[] = [];
  const corrupted: BrandFlag[] = [];
  for (const r of rows) {
    const hex = r.brand_hex ?? "";
    // U+FFFD encodes as efbfbd — a byte that was already lost before storage.
    if (hex.includes("efbfbd")) {
      corrupted.push({
        brand: r.brand_as_stored,
        productCount: r.product_count,
        hex,
        reason: "contains the Unicode replacement character — the original letter is gone",
      });
    } else if (r.byte_length !== r.char_length) {
      nonAscii.push({
        brand: r.brand_as_stored,
        productCount: r.product_count,
        hex,
        reason: "stored with real multi-byte characters (accents are intact)",
      });
    }
  }

  const groups = new Map<string, { brand: string; productCount: number }[]>();
  for (const r of rows) {
    const key = normalise(r.brand_as_stored);
    if (!key) continue;
    const list = groups.get(key);
    if (list) list.push({ brand: r.brand_as_stored, productCount: r.product_count });
    else groups.set(key, [{ brand: r.brand_as_stored, productCount: r.product_count }]);
  }

  const nearDuplicates: NearDuplicate[] = Array.from(groups.entries())
    .filter(([, list]) => list.length > 1)
    .map(([normalised, spellings]) => ({
      normalised,
      spellings: spellings.sort((a, b) => b.productCount - a.productCount),
      totalProducts: spellings.reduce((s, x) => s + x.productCount, 0),
    }))
    .sort((a, b) => b.totalProducts - a.totalProducts);

  return {
    ranAt: new Date().toISOString(),
    distinctSpellings: rows.length,
    productsWithABrand: rows.reduce((s, r) => s + r.product_count, 0),
    productsWithNoBrand,
    nonAscii,
    corrupted,
    nearDuplicates,
    spellingsUnder60Products: rows.filter((r) => r.product_count < 60).length,
  };
}
