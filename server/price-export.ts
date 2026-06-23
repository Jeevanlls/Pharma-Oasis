// ============================================================
// Price-list export — builds a customer's priced catalogue (scoped to
// chosen brands/categories) and renders it as Excel or PDF.
// ============================================================
import * as XLSX from "xlsx";
import PDFDocument from "pdfkit";
import { storage } from "./storage";
import { resolveForList, toCustomerPrice } from "./pricing";
import { getCustomerCatalogue, listPricingCategories } from "./pricing-v2";

export interface ExportScope {
  brandIds?: number[];
  categoryIds?: number[];
}

export interface PriceRow {
  brand: string;
  category: string;
  productName: string;
  ean: string;
  packSize: string;
  price: number | null;
  availability: string;
}

export interface PriceListExport {
  title: string;
  generatedAt: Date;
  rows: PriceRow[];
}

const availabilityLabel: Record<string, string> = {
  in_stock: "In stock",
  out_of_stock: "Out of stock",
  on_request: "On request",
};

/** Gather a customer's priced rows for the given price list, scoped to brands/categories. */
export async function buildPriceListData(
  priceListId: number | null | undefined,
  scope: ExportScope,
  title: string,
): Promise<PriceListExport> {
  const [allProducts, brands, categories] = await Promise.all([
    storage.getAllProducts({ activeOnly: true, limit: 10000, offset: 0 }),
    storage.getAllBrands(false),
    storage.getAllCategories(false),
  ]);
  const brandName = new Map(brands.map((b) => [b.id, b.name]));
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  const brandSet = scope.brandIds && scope.brandIds.length ? new Set(scope.brandIds) : null;
  const catSet = scope.categoryIds && scope.categoryIds.length ? new Set(scope.categoryIds) : null;

  let filtered = allProducts;
  if (brandSet) filtered = filtered.filter((p) => p.brandId != null && brandSet.has(p.brandId));
  if (catSet) filtered = filtered.filter((p) => (p.categoryId != null && catSet.has(p.categoryId)) || (p.subcategoryId != null && catSet.has(p.subcategoryId)));

  const resolved = await resolveForList(priceListId, filtered);

  const rows: PriceRow[] = filtered.map((p) => {
    const cp = toCustomerPrice(resolved.get(p.id)!);
    return {
      brand: (p.brandId != null && brandName.get(p.brandId)) || "",
      category: (p.categoryId != null && catName.get(p.categoryId)) || "",
      productName: p.productName,
      ean: p.ean || "",
      packSize: p.packSize || "",
      price: cp.price,
      availability: availabilityLabel[cp.availability] || cp.availability,
    };
  });

  // Sort by brand then product for a tidy sheet.
  rows.sort((a, b) => a.brand.localeCompare(b.brand) || a.productName.localeCompare(b.productName));

  return { title, generatedAt: new Date(), rows };
}

/** v2: build a customer's downloadable list from their PREPARED prices
 *  (across the lists nominated to them), scoped to chosen brands/categories. */
export async function buildCustomerPriceListData(
  customerId: number,
  scope: ExportScope,
  title: string,
): Promise<PriceListExport> {
  const [items, categories] = await Promise.all([
    getCustomerCatalogue(customerId, {}),
    listPricingCategories(),
  ]);
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const brandSet = scope.brandIds && scope.brandIds.length ? new Set(scope.brandIds) : null;
  const catSet = scope.categoryIds && scope.categoryIds.length ? new Set(scope.categoryIds) : null;

  let filtered = items;
  if (brandSet) filtered = filtered.filter((i) => i.brandId != null && brandSet.has(i.brandId));
  if (catSet) filtered = filtered.filter((i) => i.pricingCategoryId != null && catSet.has(i.pricingCategoryId));

  const rows: PriceRow[] = filtered.map((i) => ({
    brand: i.brandName || "",
    category: (i.pricingCategoryId != null && catName.get(i.pricingCategoryId)) || "",
    productName: i.description || "",
    ean: i.ean || "",
    packSize: i.caseSize || "",
    price: i.price,
    availability: availabilityLabel[i.availability] || i.availability,
  }));
  rows.sort((a, b) => a.brand.localeCompare(b.brand) || a.productName.localeCompare(b.productName));
  return { title, generatedAt: new Date(), rows };
}

const priceCell = (n: number | null) => (n === null ? "On request" : Number(n).toFixed(2));

export function buildPriceListXlsx(data: PriceListExport): Buffer {
  const header = ["Brand", "Category", "Product", "EAN", "Pack Size", "Price (£)", "Availability"];
  const aoa: any[][] = [
    [data.title],
    [`Generated ${data.generatedAt.toLocaleString("en-GB")}`],
    [],
    header,
    ...data.rows.map((r) => [r.brand, r.category, r.productName, r.ean, r.packSize, priceCell(r.price), r.availability]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 40 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Price List");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export function buildPriceListPdf(data: PriceListExport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 36, layout: "landscape" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc.fontSize(16).fillColor("#0f766e").text("Pharma Oasis", { continued: false });
    doc.fontSize(13).fillColor("#111").text(data.title);
    doc.fontSize(8).fillColor("#666").text(`Generated ${data.generatedAt.toLocaleString("en-GB")} — prices are your account prices and may be subject to confirmation.`);
    doc.moveDown(0.5);

    const cols = [
      { label: "Brand", w: 90 },
      { label: "Product", w: 250 },
      { label: "EAN", w: 95 },
      { label: "Pack", w: 55 },
      { label: "Price £", w: 60 },
      { label: "Availability", w: 75 },
    ];
    const startX = doc.page.margins.left;
    const rowH = 16;

    const drawHeader = (y: number) => {
      doc.fontSize(8).fillColor("#fff");
      let x = startX;
      doc.rect(startX, y, cols.reduce((s, c) => s + c.w, 0), rowH).fill("#0f766e");
      doc.fillColor("#fff");
      for (const c of cols) {
        doc.text(c.label, x + 3, y + 4, { width: c.w - 6, ellipsis: true });
        x += c.w;
      }
      return y + rowH;
    };

    let y = drawHeader(doc.y);
    let i = 0;
    for (const r of data.rows) {
      if (y + rowH > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = drawHeader(doc.page.margins.top);
      }
      if (i % 2 === 0) doc.rect(startX, y, cols.reduce((s, c) => s + c.w, 0), rowH).fill("#f1f5f9");
      doc.fillColor("#111").fontSize(7.5);
      const cells = [r.brand, r.productName, r.ean, r.packSize, priceCell(r.price), r.availability];
      let x = startX;
      cells.forEach((val, idx) => {
        doc.text(String(val), x + 3, y + 4, { width: cols[idx].w - 6, ellipsis: true, lineBreak: false });
        x += cols[idx].w;
      });
      y += rowH;
      i++;
    }
    if (data.rows.length === 0) {
      doc.fillColor("#666").fontSize(10).text("No products in the selected scope.", startX, y + 10);
    }

    doc.end();
  });
}
