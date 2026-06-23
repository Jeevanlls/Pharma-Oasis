// ============================================================
// Customer pricing resolver
// price = active supplier cost x (1 + margin%), most-specific rule wins.
// A "fixed price" rule overrides the margin calculation.
// ============================================================
import { db } from "./db";
import { priceListRules } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { PriceListRule } from "@shared/schema";

export type RuleLevel = "product" | "category" | "brand" | "overall";

export interface PriceableProduct {
  id: number;
  brandId: number | null;
  categoryId: number | null;
  subcategoryId?: number | null;
  rrp?: string | number | null;
  activeCostPrice?: string | number | null;
  costStatus?: string | null;
  availableQty?: number | null;
}

export interface ResolvedPrice {
  productId: number;
  price: number | null;         // final customer price (null = price on request)
  cost: number | null;          // ADMIN-ONLY — strip before sending to customers
  marginPercent: number | null; // ADMIN-ONLY
  ruleLevel: RuleLevel | null;  // which rule won
  isFixed: boolean;             // true when a fixed-price rule was used
  costStatus: string;           // none | active | expired
  availableQty: number | null;
}

const LEVEL_RANK: Record<RuleLevel, number> = {
  product: 4,
  category: 3,
  brand: 2,
  overall: 1,
};

const num = (v: string | number | null | undefined): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Load the active rules for a price list. */
export async function getRulesForList(priceListId: number): Promise<PriceListRule[]> {
  return db
    .select()
    .from(priceListRules)
    .where(and(eq(priceListRules.priceListId, priceListId), eq(priceListRules.isActive, true)));
}

/** Pick the single most-specific rule that applies to a product. */
export function pickRule(product: PriceableProduct, rules: PriceListRule[]): PriceListRule | null {
  let best: PriceListRule | null = null;
  let bestRank = 0;
  for (const r of rules) {
    const level = r.level as RuleLevel;
    let matches = false;
    if (level === "overall") matches = true;
    else if (level === "brand") matches = r.targetId === product.brandId;
    else if (level === "category")
      matches = r.targetId === product.categoryId || r.targetId === (product.subcategoryId ?? -1);
    else if (level === "product") matches = r.targetId === product.id;
    if (!matches) continue;
    const rank = LEVEL_RANK[level] ?? 0;
    if (rank > bestRank) {
      best = r;
      bestRank = rank;
    }
  }
  return best;
}

/** Resolve one product's price for a given (already-loaded) rule set. */
export function resolveForProduct(product: PriceableProduct, rules: PriceListRule[]): ResolvedPrice {
  const cost = num(product.activeCostPrice ?? null);
  const rule = pickRule(product, rules);
  let price: number | null = null;
  let marginPercent: number | null = null;
  let isFixed = false;

  if (rule) {
    const fixed = num(rule.fixedPrice);
    const margin = num(rule.marginPercent);
    if (fixed !== null) {
      price = round2(fixed);
      isFixed = true;
    } else if (margin !== null && cost !== null) {
      marginPercent = margin;
      price = round2(cost * (1 + margin / 100));
    }
  }

  return {
    productId: product.id,
    price,
    cost,
    marginPercent,
    ruleLevel: rule ? (rule.level as RuleLevel) : null,
    isFixed,
    costStatus: product.costStatus ?? "none",
    availableQty: product.availableQty ?? null,
  };
}

/** Resolve a whole list of products under one price list (loads rules once). */
export async function resolveForList(
  priceListId: number | null | undefined,
  productList: PriceableProduct[],
): Promise<Map<number, ResolvedPrice>> {
  const rules = priceListId ? await getRulesForList(priceListId) : [];
  const map = new Map<number, ResolvedPrice>();
  for (const p of productList) map.set(p.id, resolveForProduct(p, rules));
  return map;
}

export type Availability = "in_stock" | "out_of_stock" | "on_request";

/** Stock label from the supplier QTY column (blank = on request). */
export function availabilityOf(qty: number | null | undefined): Availability {
  if (qty === null || qty === undefined) return "on_request";
  if (qty <= 0) return "out_of_stock";
  return "in_stock";
}

/** Customer-safe view of a resolved price (NO cost / margin leakage). */
export function toCustomerPrice(r: ResolvedPrice) {
  return {
    productId: r.productId,
    price: r.price,
    availability: availabilityOf(r.availableQty),
    availableQty: r.availableQty,
  };
}
