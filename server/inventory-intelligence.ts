import type { CostOption } from "../shared/trade-intelligence";
import { signCostSource } from "./quote-price-source";

export class InventoryLookupError extends Error { constructor(message: string, public status = 503) { super(message); } }

export async function fetchInventoryIntelligence(quoteId: number, ean: string, customerRef: number | null) {
  const key = process.env.INVENTORY_INTELLIGENCE_TOKEN;
  const base = process.env.INVENTORY_INTELLIGENCE_URL || process.env.INVENTORY_API_URL;
  if (!key || !base) throw new InventoryLookupError("Inventory intelligence is not connected yet. You can still enter prices manually.");
  const url = new URL("/api/portal/product-intelligence", base);
  if (url.protocol !== "https:") throw new InventoryLookupError("The inventory connection requires HTTPS.");
  url.searchParams.set("ean", ean);
  if (customerRef) url.searchParams.set("customerRef", String(customerRef));
  let response: Response;
  try { response = await fetch(url, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }, signal: AbortSignal.timeout(25000), redirect: "error" }); }
  catch { throw new InventoryLookupError("Inventory lookup timed out or is unavailable. Retry or enter prices manually."); }
  if (!response.ok) {
    if (response.status === 404) throw new InventoryLookupError("No inventory product matches this EAN.", 404);
    if (response.status === 409) throw new InventoryLookupError("Duplicate inventory EAN: resolve the match before quoting.", 409);
    if (response.status === 429) throw new InventoryLookupError("Inventory is busy. Please retry in a few seconds.", 429);
    throw new InventoryLookupError("The inventory connection is unavailable. Retry or contact your administrator.");
  }
  const data = await response.json() as any;
  if (data?.product?.ean !== ean || !data.inventory || !Array.isArray(data.supplierPrices))
    throw new InventoryLookupError("Inventory returned an unexpected product response. Please retry.");
  const common = { ean, productRef: Number(data.product.id), fetchedAt: data.fetchedAt };
  const options: CostOption[] = data.supplierPrices.map((p: any) => ({ ...common, source: "supplier_price",
    unitCost: String(p.unitCost), currency: p.currency || "GBP", supplierId: p.supplierId,
    supplierName: p.supplierName, reference: p.reference ?? null, priceDate: p.priceDate ?? null,
    latestForSupplier: !!p.latestForSupplier, comments: p.comments ?? null }));
  if (data.lastPurchase) {
    const p = data.lastPurchase;
    options.unshift({ ...common, source: "last_purchase", unitCost: String(p.unitCost), currency: p.currency,
      supplierId: p.supplierId, supplierName: p.supplierName, reference: p.reference, priceDate: p.receivedAt,
      provisional: p.receiptComplete === false });
  }
  for (const p of data.pricing?.supplierCosts?.suppliers || []) {
    if (p.source === "inventory") options.push({ ...common, source: "inventory_batch", unitCost: String(p.pricePerUnit),
      currency: p.currency || "GBP", supplierId: p.supplierId ?? null, supplierName: p.supplierName,
      reference: p.quoteReference ?? null, priceDate: p.updatedAt ?? null });
  }
  return { ...data, costOptions: options.map(option => ({ ...option, token: signCostSource(quoteId, option, key) })) };
}
