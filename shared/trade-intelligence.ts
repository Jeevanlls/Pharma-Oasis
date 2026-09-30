export interface CostOption {
  source: "supplier_price" | "last_purchase" | "inventory_batch";
  ean: string; productRef: number; unitCost: string; currency: string;
  supplierId: number | null; supplierName: string | null;
  reference: string | null; priceDate: string | null; fetchedAt: string;
  latestForSupplier?: boolean; provisional?: boolean;
  token?: string; comments?: string | null;
}
export interface PricingSource extends CostOption { appliedAt: string; appliedBy: number }
export interface TradeIntelligence {
  product: { id: number; ean: string; name: string; brand: string | null; packSize: string | null; caseSize: number | null };
  fetchedAt: string; customerLinked: boolean; warnings: string[];
  inventory: { onHand: number; allocated: number; available: number; incoming: number };
  costOptions: CostOption[];
  customerPrice: { price: number | null; scope: string; listId: number } | null;
  pricing: { recommendations: { suggestedMinPrice: string; suggestedMaxPrice: string; optimalPricePoint: string; confidence: string } | null;
    reasoning: string | null; dealPerformance: { wonDeals: number; lostDeals: number; winRate: string } } | null;
  sales: HistoryLine[]; customerSales: HistoryLine[]; purchases: HistoryLine[];
}
export interface HistoryLine {
  source?: string; reference?: string; date?: string; supplierName?: string; customerName?: string;
  quantity: number; unitCost?: string; unitPrice?: string; currency: string;
}
export function validCost(option: Pick<CostOption, "unitCost" | "currency">) {
  return option.currency === "GBP" && Number.isFinite(Number(option.unitCost)) && Number(option.unitCost) > 0;
}
export function sellingPriceFromMarkup(cost: string, markup: string): string | null {
  if (!cost.trim() || !markup.trim()) return null;
  const c = Number(cost), m = Number(markup);
  if (!Number.isFinite(c) || c <= 0 || !Number.isFinite(m) || m < 0 || m > 10000) return null;
  return (Math.round((c * (1 + m / 100) + Number.EPSILON) * 100) / 100).toFixed(2);
}

// Customer responses must never serialize supplier costs or internal product records.
export function customerQuoteView(quote: any) {
  const { adminNotes, inventoryPushError, inventoryEnquiryRef, inventoryPushedAt, ...publicQuote } = quote;
  return { ...publicQuote, ...(quote.items ? { items: quote.items.map(customerLineView) } : {}) };
}
export function customerLineView(line: any) {
  return { id: line.id, productId: line.productId, priceListItemId: line.priceListItemId,
    ean: line.ean, description: line.description, productName: line.productName,
    quantity: line.quantity, unitPrice: line.unitPrice, lineTotal: line.lineTotal,
    product: line.product ? { id: line.product.id, ean: line.product.ean, productName: line.product.productName,
      imageUrl: line.product.imageUrl, brand: line.product.brand } : undefined };
}
