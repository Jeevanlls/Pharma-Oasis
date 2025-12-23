import { db } from "./db";
import { products, categories, brands } from "@shared/schema";
import { eq, isNull, or, and, sql } from "drizzle-orm";

const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES = 1000;

interface PricingRule {
  rrpDiscountPercent: number;
  wholesaleMarkupPercent: number;
  categoryDefaults: Record<string, number>;
}

const DEFAULT_PRICING_RULES: PricingRule = {
  rrpDiscountPercent: 25,
  wholesaleMarkupPercent: 10,
  categoryDefaults: {
    "OTC Medicines": 7.99,
    "Vitamins & Supplements": 12.99,
    "Skincare": 9.99,
    "First Aid": 5.99,
    "Baby Care": 8.99,
    "Oral Care": 4.99,
    "Medical Devices": 15.99,
    "default": 9.99,
  },
};

function calculateGoogleFeedPrice(
  rrp: string | null,
  wholesalePrice: string | null,
  categoryName: string | null,
  rules: PricingRule = DEFAULT_PRICING_RULES
): { price: number | null; method: string; confidence: "high" | "medium" | "low" } {
  
  if (rrp && parseFloat(rrp) > 0) {
    const rrpNum = parseFloat(rrp);
    const discountMultiplier = 1 - (rules.rrpDiscountPercent / 100);
    const calculatedPrice = Math.round(rrpNum * discountMultiplier * 100) / 100;
    return { 
      price: calculatedPrice, 
      method: `RRP (${rrp}) - ${rules.rrpDiscountPercent}%`,
      confidence: "high" 
    };
  }

  if (wholesalePrice && parseFloat(wholesalePrice) > 0) {
    const wsNum = parseFloat(wholesalePrice);
    const markupMultiplier = 1 + (rules.wholesaleMarkupPercent / 100);
    const calculatedPrice = Math.round(wsNum * markupMultiplier * 100) / 100;
    return { 
      price: calculatedPrice, 
      method: `Wholesale (${wholesalePrice}) + ${rules.wholesaleMarkupPercent}%`,
      confidence: "medium" 
    };
  }

  const catKey = categoryName || "default";
  const defaultPrice = rules.categoryDefaults[catKey] || rules.categoryDefaults["default"];
  return { 
    price: defaultPrice, 
    method: `Category default (${catKey})`,
    confidence: "low" 
  };
}

export async function processGooglePriceBatch(options?: {
  forceRegenerate?: boolean;
  rules?: PricingRule;
}): Promise<{
  processed: number;
  remaining: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
}> {
  const { forceRegenerate = false, rules = DEFAULT_PRICING_RULES } = options || {};
  
  console.log("[Price Processor] Starting Google Feed price batch...");

  try {
    const whereCondition = forceRegenerate 
      ? undefined
      : or(
          isNull(products.googleFeedPrice),
          eq(sql`CAST(${products.googleFeedPrice} AS TEXT)`, "")
        );

    const productsNeedingPrice = await db.query.products.findMany({
      where: whereCondition,
      with: {
        category: true,
      },
      limit: BATCH_SIZE,
    });

    console.log(`[Price Processor] Found ${productsNeedingPrice.length} products to process`);

    const totalRemaining = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(
        or(
          isNull(products.googleFeedPrice),
          eq(sql`CAST(${products.googleFeedPrice} AS TEXT)`, "")
        )
      );

    let processed = 0;
    let highConfidence = 0;
    let mediumConfidence = 0;
    let lowConfidence = 0;

    for (const product of productsNeedingPrice) {
      try {
        const result = calculateGoogleFeedPrice(
          product.rrp,
          product.wholesalePrice,
          product.category?.name || null,
          rules
        );

        if (result.price !== null) {
          await db
            .update(products)
            .set({
              googleFeedPrice: result.price.toString(),
              updatedAt: new Date(),
            })
            .where(eq(products.id, product.id));

          console.log(
            `[Price Processor] Product ${product.id} (${product.productName}): £${result.price} via ${result.method} [${result.confidence}]`
          );

          processed++;
          if (result.confidence === "high") highConfidence++;
          else if (result.confidence === "medium") mediumConfidence++;
          else lowConfidence++;
        }
      } catch (error) {
        console.error(`[Price Processor] Error processing product ${product.id}:`, error);
      }
    }

    const remaining = Number(totalRemaining[0]?.count || 0) - processed;
    console.log(
      `[Price Processor] Batch complete. Processed: ${processed}, Remaining: ${remaining}, High: ${highConfidence}, Medium: ${mediumConfidence}, Low: ${lowConfidence}`
    );

    return { processed, remaining, highConfidence, mediumConfidence, lowConfidence };
  } catch (error) {
    console.error("[Price Processor] Batch error:", error);
    return { processed: 0, remaining: -1, highConfidence: 0, mediumConfidence: 0, lowConfidence: 0 };
  }
}

export async function processAllGooglePrices(options?: {
  forceRegenerate?: boolean;
  rules?: PricingRule;
}): Promise<{
  totalProcessed: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
}> {
  console.log("[Price Processor] Starting full price processing...");
  
  let totalProcessed = 0;
  let totalHigh = 0;
  let totalMedium = 0;
  let totalLow = 0;
  let remaining = 1;

  while (remaining > 0) {
    const result = await processGooglePriceBatch(options);
    totalProcessed += result.processed;
    totalHigh += result.highConfidence;
    totalMedium += result.mediumConfidence;
    totalLow += result.lowConfidence;
    remaining = result.remaining;

    if (result.processed > 0 && remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }

  console.log(
    `[Price Processor] Full processing complete. Total: ${totalProcessed}, High: ${totalHigh}, Medium: ${totalMedium}, Low: ${totalLow}`
  );

  return {
    totalProcessed,
    highConfidence: totalHigh,
    mediumConfidence: totalMedium,
    lowConfidence: totalLow,
  };
}

export async function getGooglePriceStatus(): Promise<{
  total: number;
  withPrice: number;
  withoutPrice: number;
  percentComplete: number;
}> {
  const allProducts = await db.query.products.findMany({
    columns: { id: true, googleFeedPrice: true },
  });

  const total = allProducts.length;
  const withPrice = allProducts.filter(
    (p) => p.googleFeedPrice && parseFloat(p.googleFeedPrice) > 0
  ).length;
  const withoutPrice = total - withPrice;

  return {
    total,
    withPrice,
    withoutPrice,
    percentComplete: total > 0 ? Math.round((withPrice / total) * 100) : 0,
  };
}
