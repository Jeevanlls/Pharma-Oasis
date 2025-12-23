import { db } from "./db";
import { products } from "@shared/schema";
import { eq, isNull, or, sql } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI();

const BATCH_SIZE = 5;
const DELAY_BETWEEN_PRODUCTS = 2000;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 100);
}

async function generateSeoContent(
  productName: string,
  brandName: string | null,
  categoryName: string | null,
  description: string | null
): Promise<{ metaTitle: string; metaDescription: string }> {
  try {
    const prompt = `Generate SEO meta tags for this pharmaceutical/healthcare product for a UK B2B wholesale website:

Product: ${productName}
Brand: ${brandName || "Generic"}
Category: ${categoryName || "Healthcare"}
Description: ${description || "No description available"}

Requirements:
1. Meta Title: 50-60 characters, include product name and "Buy Wholesale UK"
2. Meta Description: 120-160 characters, compelling for B2B buyers, mention wholesale pricing

Return JSON only:
{"metaTitle": "...", "metaDescription": "..."}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      return {
        metaTitle: parsed.metaTitle?.substring(0, 255) || "",
        metaDescription: parsed.metaDescription?.substring(0, 500) || "",
      };
    }
  } catch (error) {
    console.error("[SEO Processor] AI generation error:", error);
  }

  return {
    metaTitle: `${productName} - Buy Wholesale UK | Pharma Oasis`,
    metaDescription: `Buy ${productName} at competitive wholesale prices. ${brandName ? `Official ${brandName} distributor.` : ""} Fast UK delivery. Request a quote today.`,
  };
}

export async function processSeoBackgroundBatch(): Promise<{
  processed: number;
  remaining: number;
}> {
  console.log("[SEO Processor] Starting background SEO batch...");

  try {
    const productsNeedingSeo = await db.query.products.findMany({
      where: or(
        isNull(products.slug),
        isNull(products.metaTitle),
        isNull(products.metaDescription),
        eq(products.slug, ""),
        eq(products.metaTitle, ""),
        eq(products.metaDescription, "")
      ),
      with: {
        brand: true,
        category: true,
      },
      limit: BATCH_SIZE,
    });

    console.log(`[SEO Processor] Found ${productsNeedingSeo.length} products needing SEO`);

    const totalRemaining = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(
        or(
          isNull(products.slug),
          isNull(products.metaTitle),
          isNull(products.metaDescription),
          eq(products.slug, ""),
          eq(products.metaTitle, ""),
          eq(products.metaDescription, "")
        )
      );

    let processed = 0;

    for (const product of productsNeedingSeo) {
      try {
        const needsSlug = !product.slug;
        const needsMetaTitle = !product.metaTitle;
        const needsMetaDescription = !product.metaDescription;

        const updates: Partial<typeof products.$inferInsert> = {};

        if (needsSlug) {
          updates.slug = generateSlug(product.productName);
        }

        if (needsMetaTitle || needsMetaDescription) {
          const seoContent = await generateSeoContent(
            product.productName,
            product.brand?.name || null,
            product.category?.name || null,
            product.shortDescription || product.longDescription || null
          );

          if (needsMetaTitle) {
            updates.metaTitle = seoContent.metaTitle;
          }
          if (needsMetaDescription) {
            updates.metaDescription = seoContent.metaDescription;
          }
        }

        if (Object.keys(updates).length > 0) {
          updates.updatedAt = new Date();
          await db
            .update(products)
            .set(updates)
            .where(eq(products.id, product.id));

          console.log(`[SEO Processor] Updated product ${product.id}: ${product.productName}`);
          processed++;
        }

        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_PRODUCTS));
      } catch (error) {
        console.error(`[SEO Processor] Error processing product ${product.id}:`, error);
      }
    }

    const remaining = Number(totalRemaining[0]?.count || 0) - processed;
    console.log(`[SEO Processor] Batch complete. Processed: ${processed}, Remaining: ${remaining}`);

    return { processed, remaining };
  } catch (error) {
    console.error("[SEO Processor] Batch error:", error);
    return { processed: 0, remaining: -1 };
  }
}

let seoIntervalId: NodeJS.Timeout | null = null;

export function startSeoBackgroundProcessor(intervalHours: number = 2): void {
  if (seoIntervalId) {
    console.log("[SEO Processor] Already running");
    return;
  }

  console.log(`[SEO Processor] Starting background processor (every ${intervalHours} hours)`);
  
  processSeoBackgroundBatch();

  const intervalMs = intervalHours * 60 * 60 * 1000;
  seoIntervalId = setInterval(() => {
    processSeoBackgroundBatch();
  }, intervalMs);
}

export function stopSeoBackgroundProcessor(): void {
  if (seoIntervalId) {
    clearInterval(seoIntervalId);
    seoIntervalId = null;
    console.log("[SEO Processor] Background processor stopped");
  }
}
