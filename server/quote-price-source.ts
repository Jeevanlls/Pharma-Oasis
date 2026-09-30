import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { validCost, type CostOption, type PricingSource } from "../shared/trade-intelligence";

const sourceSchema = z.object({
  quoteId: z.number().int().positive(), ean: z.string().regex(/^\d{8,14}$/), productRef: z.number().int().positive(),
  source: z.enum(["supplier_price", "last_purchase", "inventory_batch"]),
  unitCost: z.string().min(1).max(30), currency: z.literal("GBP"),
  supplierId: z.number().int().positive().nullable(), supplierName: z.string().max(500).nullable(),
  reference: z.string().max(500).nullable(), priceDate: z.string().max(64).nullable(), fetchedAt: z.string().datetime(),
});
function signature(payload: string, key: string) { return createHmac("sha256", key).update("quote-cost:" + payload).digest("base64url"); }
export function signCostSource(quoteId: number, option: CostOption, key: string): string | undefined {
  if (!key || !validCost(option)) return undefined;
  const source = sourceSchema.parse({ ...option, quoteId });
  const payload = Buffer.from(JSON.stringify(source)).toString("base64url");
  return `${payload}.${signature(payload, key)}`;
}
export function verifyCostSource(token: string, quoteId: number, ean: string, unitCost: number | null, actorId: number, key: string, now = Date.now()): PricingSource {
  if (!key || token.length > 6000) throw new Error("Refresh product intelligence and select the cost again.");
  const [payload, sig, extra] = token.split(".");
  const expected = signature(payload || "", key);
  if (!sig || extra || sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
    throw new Error("Invalid price source. Refresh product intelligence and select the cost again.");
  const source = sourceSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
  if (source.quoteId !== quoteId || source.ean !== ean || unitCost == null || Math.abs(Number(source.unitCost) - unitCost) > 0.00001)
    throw new Error("The selected price source no longer matches this quote line.");
  const age = now - Date.parse(source.fetchedAt);
  if (age < -60000 || age > 86400000) throw new Error("This cost lookup is over 24 hours old. Refresh before applying it.");
  const { quoteId: _, ...snapshot } = source;
  return { ...snapshot, appliedAt: new Date(now).toISOString(), appliedBy: actorId };
}
