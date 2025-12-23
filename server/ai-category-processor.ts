import { db } from "./db";
import { products, categories, aiCategoryReviews, categoryAliases, aiCategoryAgentStatus } from "@shared/schema";
import { eq, isNull, notInArray, sql, and, or, desc, asc } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const BATCH_SIZE = 10;
const DELAY_BETWEEN_PRODUCTS = 2000;
const RUN_INTERVAL_MINUTES = 5;

interface CategoryInfo {
  id: number;
  name: string;
  parentId: number | null;
  isSubcategory: boolean;
}

interface AiCategoryResult {
  categoryName: string;
  subcategoryName: string | null;
  confidence: number;
  reasoning: string;
  suggestedMerge?: {
    fromName: string;
    toName: string;
    isSubcategory: boolean;
  };
}

async function getCanonicalCategories(): Promise<{
  mainCategories: CategoryInfo[];
  subcategories: CategoryInfo[];
  aliasMap: Map<string, number>;
}> {
  const allCategories = await db.query.categories.findMany({
    where: eq(categories.isActive, true),
  });

  const aliases = await db.query.categoryAliases.findMany();

  const mainCategories: CategoryInfo[] = [];
  const subcategories: CategoryInfo[] = [];

  for (const cat of allCategories) {
    if (cat.parentId === null) {
      mainCategories.push({ id: cat.id, name: cat.name, parentId: null, isSubcategory: false });
    } else {
      subcategories.push({ id: cat.id, name: cat.name, parentId: cat.parentId, isSubcategory: true });
    }
  }

  const aliasMap = new Map<string, number>();
  for (const alias of aliases) {
    aliasMap.set(alias.aliasName.toLowerCase(), alias.canonicalCategoryId);
  }

  return { mainCategories, subcategories, aliasMap };
}

async function analyzeProductCategory(
  product: {
    id: number;
    productName: string;
    shortDescription: string | null;
    longDescription: string | null;
    categoryId: number;
    subcategoryId: number | null;
    currentCategoryName: string;
    currentSubcategoryName: string | null;
  },
  mainCategories: CategoryInfo[],
  subcategories: CategoryInfo[]
): Promise<AiCategoryResult> {
  const categoryList = mainCategories.map(c => c.name).join(", ");
  const subcategoryList = subcategories.map(c => `${c.name} (under parent ID ${c.parentId})`).join(", ");

  const prompt = `You are a pharmaceutical product categorization expert. Analyze this product and determine the correct category and subcategory.

PRODUCT INFO:
- Name: ${product.productName}
- Current Category: ${product.currentCategoryName}
- Current Subcategory: ${product.currentSubcategoryName || "None"}
- Description: ${product.shortDescription || product.longDescription || "No description"}

AVAILABLE MAIN CATEGORIES:
${categoryList}

AVAILABLE SUBCATEGORIES:
${subcategoryList}

TASK:
1. Determine if the product is in the CORRECT category and subcategory
2. If the current category/subcategory is a VARIANT spelling (e.g., "Skin Care" vs "Skincare", "First Aid" vs "First Aid & Medical Devices"), note this
3. Choose the most appropriate category and subcategory from the available options

RULES:
- Products like skincare, moisturizers, dry skin treatments → "Skincare" main category
- Pain relief tablets, painkillers → "OTC Medicines" with "Pain Relief" subcategory
- First aid items like bandages, plasters, antiseptics → "First Aid" main category
- Vitamins, supplements → "Vitamins & Supplements" main category
- Baby products → "Baby Care" main category

Return JSON only:
{
  "categoryName": "exact category name from available list",
  "subcategoryName": "exact subcategory name or null if none appropriate",
  "confidence": 0.95,
  "reasoning": "brief explanation",
  "suggestedMerge": {"fromName": "Skin Care", "toName": "Skincare", "isSubcategory": false} or null
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      return {
        categoryName: parsed.categoryName || product.currentCategoryName,
        subcategoryName: parsed.subcategoryName || null,
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || "AI analysis",
        suggestedMerge: parsed.suggestedMerge || undefined,
      };
    }
  } catch (error) {
    console.error("[AI Category] AI analysis error:", error);
  }

  return {
    categoryName: product.currentCategoryName,
    subcategoryName: product.currentSubcategoryName,
    confidence: 0,
    reasoning: "AI analysis failed, keeping current category",
  };
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function findCategoryByName(
  name: string, 
  isSubcategory: boolean,
  allCategories: CategoryInfo[],
  aliasMap: Map<string, number>
): Promise<number | null> {
  const normalizedName = normalizeText(name);
  
  const aliasId = aliasMap.get(name.toLowerCase());
  if (aliasId) {
    return aliasId;
  }
  
  const exactMatch = allCategories.find(
    c => c.name === name && c.isSubcategory === isSubcategory
  );
  if (exactMatch) {
    return exactMatch.id;
  }
  
  const fuzzyMatch = allCategories.find(
    c => normalizeText(c.name) === normalizedName && c.isSubcategory === isSubcategory
  );
  if (fuzzyMatch) {
    return fuzzyMatch.id;
  }
  
  return null;
}

async function recordAlias(aliasName: string, canonicalId: number, isSubcategory: boolean): Promise<void> {
  const existing = await db.query.categoryAliases.findFirst({
    where: eq(categoryAliases.aliasName, aliasName),
  });

  if (!existing) {
    await db.insert(categoryAliases).values({
      aliasName,
      canonicalCategoryId: canonicalId,
      isSubcategory,
      discoveredBy: "ai",
    });
    console.log(`[AI Category] Recorded alias: "${aliasName}" → category ID ${canonicalId}`);
  }
}

async function getOrCreateAgentStatus(): Promise<typeof aiCategoryAgentStatus.$inferSelect> {
  let status = await db.query.aiCategoryAgentStatus.findFirst();
  if (!status) {
    const inserted = await db.insert(aiCategoryAgentStatus).values({
      isRunning: false,
      totalProductsProcessed: 0,
      totalChanges: 0,
      lastProductId: 0,
      errorCount: 0,
    }).returning();
    status = inserted[0];
  }
  return status!;
}

async function updateAgentStatus(updates: Partial<typeof aiCategoryAgentStatus.$inferInsert>): Promise<void> {
  await db.update(aiCategoryAgentStatus)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(aiCategoryAgentStatus.id, 1));
}

export async function processCategoryBatch(): Promise<{
  processed: number;
  changes: number;
  remaining: number;
}> {
  console.log("[AI Category] Starting category analysis batch...");

  try {
    const status = await getOrCreateAgentStatus();

    const reviewedProductIds = await db
      .select({ productId: aiCategoryReviews.productId })
      .from(aiCategoryReviews);

    const reviewedIds = reviewedProductIds.map(r => r.productId);

    let productsToReview = await db.query.products.findMany({
      where: reviewedIds.length > 0 
        ? notInArray(products.id, reviewedIds)
        : undefined,
      with: {
        category: true,
        subcategory: true,
      },
      orderBy: [asc(products.id)],
      limit: BATCH_SIZE,
    });

    if (productsToReview.length === 0) {
      console.log("[AI Category] All products have been reviewed");
      await updateAgentStatus({ isRunning: false });
      return { processed: 0, changes: 0, remaining: 0 };
    }

    const { mainCategories, subcategories, aliasMap } = await getCanonicalCategories();

    let processed = 0;
    let changes = 0;

    for (const product of productsToReview) {
      try {
        const currentCategoryName = product.category?.name || "Unknown";
        const currentSubcategoryName = product.subcategory?.name || null;

        const result = await analyzeProductCategory(
          {
            id: product.id,
            productName: product.productName,
            shortDescription: product.shortDescription,
            longDescription: product.longDescription,
            categoryId: product.categoryId,
            subcategoryId: product.subcategoryId,
            currentCategoryName,
            currentSubcategoryName,
          },
          mainCategories,
          subcategories
        );

        let newCategoryId = product.categoryId;
        let newSubcategoryId = product.subcategoryId;
        let changesMade = false;

        const allCats = [...mainCategories, ...subcategories];
        
        if (result.categoryName !== currentCategoryName && result.confidence >= 0.7) {
          const foundCatId = await findCategoryByName(result.categoryName, false, allCats, aliasMap);
          if (foundCatId) {
            newCategoryId = foundCatId;
            changesMade = true;

            if (result.suggestedMerge && !result.suggestedMerge.isSubcategory) {
              await recordAlias(result.suggestedMerge.fromName, foundCatId, false);
            }
            
            if (currentCategoryName !== result.categoryName && currentCategoryName !== "Unknown") {
              await recordAlias(currentCategoryName, foundCatId, false);
            }
          }
        }

        if (result.subcategoryName && result.subcategoryName !== currentSubcategoryName && result.confidence >= 0.7) {
          const foundSubId = await findCategoryByName(result.subcategoryName, true, allCats, aliasMap);
          if (foundSubId) {
            newSubcategoryId = foundSubId;
            changesMade = true;

            if (result.suggestedMerge && result.suggestedMerge.isSubcategory) {
              await recordAlias(result.suggestedMerge.fromName, foundSubId, true);
            }
            
            if (currentSubcategoryName && currentSubcategoryName !== result.subcategoryName) {
              await recordAlias(currentSubcategoryName, foundSubId, true);
            }
          }
        }

        if (changesMade) {
          await db.update(products)
            .set({
              categoryId: newCategoryId,
              subcategoryId: newSubcategoryId,
              updatedAt: new Date(),
            })
            .where(eq(products.id, product.id));

          console.log(`[AI Category] Updated product ${product.id}: ${product.productName} - ${result.reasoning}`);
          changes++;
        }

        await db.insert(aiCategoryReviews).values({
          productId: product.id,
          previousCategoryId: product.categoryId,
          previousSubcategoryId: product.subcategoryId,
          newCategoryId: changesMade ? newCategoryId : null,
          newSubcategoryId: changesMade ? newSubcategoryId : null,
          confidence: String(result.confidence),
          aiReasoning: result.reasoning,
          changesMade,
          status: "completed",
        });

        processed++;
        await updateAgentStatus({
          lastProductId: product.id,
          totalProductsProcessed: status.totalProductsProcessed! + processed,
          totalChanges: status.totalChanges! + (changesMade ? 1 : 0),
          lastRunAt: new Date(),
        });

        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_PRODUCTS));
      } catch (error) {
        console.error(`[AI Category] Error processing product ${product.id}:`, error);
        
        await db.insert(aiCategoryReviews).values({
          productId: product.id,
          previousCategoryId: product.categoryId,
          previousSubcategoryId: product.subcategoryId,
          status: "error",
          aiReasoning: error instanceof Error ? error.message : "Unknown error",
          changesMade: false,
        });

        await updateAgentStatus({
          errorCount: (status.errorCount || 0) + 1,
          lastError: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const totalProducts = await db.select({ count: sql<number>`count(*)` }).from(products);
    const totalReviewed = await db.select({ count: sql<number>`count(*)` }).from(aiCategoryReviews);
    const remaining = Number(totalProducts[0]?.count || 0) - Number(totalReviewed[0]?.count || 0);

    console.log(`[AI Category] Batch complete. Processed: ${processed}, Changes: ${changes}, Remaining: ${remaining}`);

    return { processed, changes, remaining };
  } catch (error) {
    console.error("[AI Category] Batch error:", error);
    await updateAgentStatus({
      isRunning: false,
      lastError: error instanceof Error ? error.message : "Unknown error",
    });
    return { processed: 0, changes: 0, remaining: -1 };
  }
}

let categoryIntervalId: NodeJS.Timeout | null = null;

export function startAiCategoryProcessor(intervalMinutes: number = RUN_INTERVAL_MINUTES): void {
  if (categoryIntervalId) {
    console.log("[AI Category] Processor already running");
    return;
  }

  console.log(`[AI Category] Starting background processor (every ${intervalMinutes} minutes)`);

  updateAgentStatus({ isRunning: true });

  processCategoryBatch();

  const intervalMs = intervalMinutes * 60 * 1000;
  categoryIntervalId = setInterval(() => {
    processCategoryBatch();
  }, intervalMs);
}

export function stopAiCategoryProcessor(): void {
  if (categoryIntervalId) {
    clearInterval(categoryIntervalId);
    categoryIntervalId = null;
    updateAgentStatus({ isRunning: false });
    console.log("[AI Category] Background processor stopped");
  }
}

export async function getAiCategoryStats(): Promise<{
  status: typeof aiCategoryAgentStatus.$inferSelect | null;
  totalProducts: number;
  reviewedProducts: number;
  changesApplied: number;
  recentChanges: Array<{
    productId: number;
    productName: string;
    previousCategory: string;
    newCategory: string;
    confidence: string;
    reviewedAt: Date;
  }>;
}> {
  const status = await db.query.aiCategoryAgentStatus.findFirst() || null;
  
  const totalProducts = await db.select({ count: sql<number>`count(*)` }).from(products);
  const reviewedProducts = await db.select({ count: sql<number>`count(*)` }).from(aiCategoryReviews);
  const changesApplied = await db.select({ count: sql<number>`count(*)` })
    .from(aiCategoryReviews)
    .where(eq(aiCategoryReviews.changesMade, true));

  const recentReviews = await db.query.aiCategoryReviews.findMany({
    where: eq(aiCategoryReviews.changesMade, true),
    orderBy: [desc(aiCategoryReviews.reviewedAt)],
    limit: 20,
  });

  const recentChanges = [];
  for (const review of recentReviews) {
    const product = await db.query.products.findFirst({
      where: eq(products.id, review.productId),
      with: { category: true },
    });

    const prevCat = review.previousCategoryId 
      ? await db.query.categories.findFirst({ where: eq(categories.id, review.previousCategoryId) })
      : null;

    if (product) {
      recentChanges.push({
        productId: review.productId,
        productName: product.productName,
        previousCategory: prevCat?.name || "Unknown",
        newCategory: product.category?.name || "Unknown",
        confidence: review.confidence || "0",
        reviewedAt: review.reviewedAt,
      });
    }
  }

  return {
    status,
    totalProducts: Number(totalProducts[0]?.count || 0),
    reviewedProducts: Number(reviewedProducts[0]?.count || 0),
    changesApplied: Number(changesApplied[0]?.count || 0),
    recentChanges,
  };
}

export async function runCategoryBatchManually(): Promise<{
  processed: number;
  changes: number;
  remaining: number;
}> {
  return processCategoryBatch();
}
