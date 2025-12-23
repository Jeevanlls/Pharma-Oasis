import { db } from "./db";
import { products, brands, categories, seoAgentStatus, seoAgentActions, seoRecommendations } from "@shared/schema";
import { eq, isNull, or, sql, desc, and, lt, gt } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const BATCH_SIZE = 15;
const DELAY_BETWEEN_ITEMS = 1500;
const RUN_INTERVAL_HOURS = 24;

let isProcessorRunning = false;
let processorInterval: NodeJS.Timeout | null = null;

async function acquireLock(): Promise<boolean> {
  const status = await db.query.seoAgentStatus.findFirst();
  if (status?.isRunning) {
    const lastUpdate = status.updatedAt ? new Date(status.updatedAt).getTime() : 0;
    const now = Date.now();
    if (now - lastUpdate < 30 * 60 * 1000) {
      return false;
    }
  }
  return true;
}

async function checkSlugUnique(slug: string, table: "products" | "brands" | "categories", excludeId: number): Promise<boolean> {
  if (table === "products") {
    const existing = await db.query.products.findFirst({
      where: and(eq(products.slug, slug), sql`id != ${excludeId}`),
    });
    return !existing;
  } else if (table === "brands") {
    const existing = await db.query.brands.findFirst({
      where: and(eq(brands.slug, slug), sql`id != ${excludeId}`),
    });
    return !existing;
  } else {
    const existing = await db.query.categories.findFirst({
      where: and(eq(categories.slug, slug), sql`id != ${excludeId}`),
    });
    return !existing;
  }
}

function makeSlugUnique(baseSlug: string, id: number): string {
  return `${baseSlug}-${id}`;
}

interface SeoAnalysisResult {
  metaTitle: string;
  metaDescription: string;
  reasoning: string;
  keywords: string[];
  confidence: number;
}

interface SiteAnalysis {
  totalProducts: number;
  totalBrands: number;
  totalCategories: number;
  productsWithSeo: number;
  brandsWithSeo: number;
  categoriesWithSeo: number;
  productsMissingSeo: number;
  brandsMissingSeo: number;
  categoriesMissingSeo: number;
  topKeywords: string[];
  recommendations: Array<{
    type: string;
    priority: string;
    title: string;
    description: string;
  }>;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 100);
}

async function analyzeSite(): Promise<SiteAnalysis> {
  console.log("[SEO Agent] Analyzing entire website...");

  const allProducts = await db.query.products.findMany({
    where: eq(products.isActive, true),
    columns: { id: true, metaTitle: true, metaDescription: true, slug: true },
  });

  const allBrands = await db.query.brands.findMany({
    where: eq(brands.isActive, true),
    columns: { id: true, metaTitle: true, metaDescription: true, slug: true },
  });

  const allCategories = await db.query.categories.findMany({
    where: eq(categories.isActive, true),
    columns: { id: true, metaTitle: true, metaDescription: true, slug: true },
  });

  const productsWithSeo = allProducts.filter(p => p.metaTitle && p.metaDescription && p.slug).length;
  const brandsWithSeo = allBrands.filter(b => b.metaTitle && b.metaDescription && b.slug).length;
  const categoriesWithSeo = allCategories.filter(c => c.metaTitle && c.metaDescription && c.slug).length;

  const recommendations: SiteAnalysis["recommendations"] = [];

  if (allProducts.length - productsWithSeo > 100) {
    recommendations.push({
      type: "missing_meta",
      priority: "high",
      title: "Many products missing SEO optimization",
      description: `${allProducts.length - productsWithSeo} products are missing meta titles or descriptions. This significantly impacts search visibility.`,
    });
  }

  if (allBrands.length - brandsWithSeo > 0) {
    recommendations.push({
      type: "missing_meta",
      priority: "high",
      title: "Brands missing SEO optimization",
      description: `${allBrands.length - brandsWithSeo} brands need meta titles and descriptions for brand-specific searches.`,
    });
  }

  if (allCategories.length - categoriesWithSeo > 0) {
    recommendations.push({
      type: "missing_meta",
      priority: "medium",
      title: "Categories missing SEO optimization",
      description: `${allCategories.length - categoriesWithSeo} categories need optimization for category-based searches.`,
    });
  }

  return {
    totalProducts: allProducts.length,
    totalBrands: allBrands.length,
    totalCategories: allCategories.length,
    productsWithSeo,
    brandsWithSeo,
    categoriesWithSeo,
    productsMissingSeo: allProducts.length - productsWithSeo,
    brandsMissingSeo: allBrands.length - brandsWithSeo,
    categoriesMissingSeo: allCategories.length - categoriesWithSeo,
    topKeywords: ["pharmaceutical wholesale UK", "healthcare products trade", "medicine wholesale supplier", "pharmacy supplies bulk"],
    recommendations,
  };
}

async function generateProductSeo(
  productName: string,
  brandName: string | null,
  categoryName: string | null,
  description: string | null
): Promise<SeoAnalysisResult> {
  const prompt = `You are an SEO expert for a UK B2B pharmaceutical wholesale website (Pharma Oasis). Generate optimized SEO meta tags for this product.

Product: ${productName}
Brand: ${brandName || "Generic"}
Category: ${categoryName || "Healthcare"}
Description: ${description || "No description available"}

Requirements:
1. Meta Title (50-60 chars): Include product name, "Wholesale" or "Trade", and "UK". Make it compelling for B2B buyers.
2. Meta Description (140-160 chars): Highlight wholesale pricing, UK delivery, and value proposition. Include a call-to-action.
3. Focus on B2B keywords: wholesale, trade, bulk, supplier, distributor
4. Consider search intent: buyers looking for pharmaceutical/healthcare products at trade prices

Return JSON only:
{
  "metaTitle": "...",
  "metaDescription": "...",
  "reasoning": "Brief explanation of SEO choices",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "confidence": 0.95
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 400,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      return {
        metaTitle: parsed.metaTitle?.substring(0, 255) || "",
        metaDescription: parsed.metaDescription?.substring(0, 500) || "",
        reasoning: parsed.reasoning || "",
        keywords: parsed.keywords || [],
        confidence: parsed.confidence || 0.9,
      };
    }
  } catch (error) {
    console.error("[SEO Agent] AI generation error:", error);
  }

  return {
    metaTitle: `${productName} - Wholesale UK | Pharma Oasis`,
    metaDescription: `Buy ${productName} at competitive wholesale prices. ${brandName ? `Official ${brandName} supplier.` : ""} Fast UK delivery. Request a quote today.`,
    reasoning: "Fallback SEO generated due to API error",
    keywords: ["wholesale", "UK", "pharmaceutical"],
    confidence: 0.7,
  };
}

async function generateBrandSeo(
  brandName: string,
  description: string | null,
  productCount: number
): Promise<SeoAnalysisResult> {
  const prompt = `You are an SEO expert for a UK B2B pharmaceutical wholesale website (Pharma Oasis). Generate optimized SEO meta tags for this brand page.

Brand: ${brandName}
Description: ${description || "Healthcare and pharmaceutical brand"}
Products Available: ${productCount}

Requirements:
1. Meta Title (50-60 chars): Include brand name, "Wholesale Supplier UK" or similar
2. Meta Description (140-160 chars): Mention product range, wholesale pricing, UK distributor status
3. Target searches like "${brandName} wholesale UK", "${brandName} trade supplier"

Return JSON only:
{
  "metaTitle": "...",
  "metaDescription": "...",
  "reasoning": "Brief explanation of SEO choices",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "confidence": 0.95
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 400,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      return {
        metaTitle: parsed.metaTitle?.substring(0, 255) || "",
        metaDescription: parsed.metaDescription?.substring(0, 500) || "",
        reasoning: parsed.reasoning || "",
        keywords: parsed.keywords || [],
        confidence: parsed.confidence || 0.9,
      };
    }
  } catch (error) {
    console.error("[SEO Agent] AI generation error:", error);
  }

  return {
    metaTitle: `${brandName} Wholesale UK | Pharma Oasis`,
    metaDescription: `Shop ${brandName} products at wholesale prices. ${productCount}+ products available. Official UK distributor with fast delivery.`,
    reasoning: "Fallback SEO generated",
    keywords: [brandName.toLowerCase(), "wholesale", "UK"],
    confidence: 0.7,
  };
}

async function generateCategorySeo(
  categoryName: string,
  parentCategory: string | null,
  description: string | null,
  productCount: number
): Promise<SeoAnalysisResult> {
  const fullCategory = parentCategory ? `${parentCategory} > ${categoryName}` : categoryName;
  
  const prompt = `You are an SEO expert for a UK B2B pharmaceutical wholesale website (Pharma Oasis). Generate optimized SEO meta tags for this category page.

Category: ${fullCategory}
Description: ${description || "Healthcare and pharmaceutical products"}
Products in Category: ${productCount}

Requirements:
1. Meta Title (50-60 chars): Include category name, "Wholesale" or "Trade Prices", "UK"
2. Meta Description (140-160 chars): Describe the category, mention wholesale pricing and range
3. Target searches like "${categoryName} wholesale UK", "buy ${categoryName} trade"

Return JSON only:
{
  "metaTitle": "...",
  "metaDescription": "...",
  "reasoning": "Brief explanation of SEO choices",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "confidence": 0.95
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 400,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      return {
        metaTitle: parsed.metaTitle?.substring(0, 255) || "",
        metaDescription: parsed.metaDescription?.substring(0, 500) || "",
        reasoning: parsed.reasoning || "",
        keywords: parsed.keywords || [],
        confidence: parsed.confidence || 0.9,
      };
    }
  } catch (error) {
    console.error("[SEO Agent] AI generation error:", error);
  }

  return {
    metaTitle: `${categoryName} Wholesale UK | Pharma Oasis`,
    metaDescription: `Browse ${categoryName} at wholesale prices. ${productCount}+ products available. Trade accounts welcome. Fast UK delivery.`,
    reasoning: "Fallback SEO generated",
    keywords: [categoryName.toLowerCase(), "wholesale", "UK"],
    confidence: 0.7,
  };
}

async function logAction(
  actionType: string,
  entityType: string,
  entityId: number | null,
  entityName: string,
  previousValue: any,
  newValue: any,
  reasoning: string,
  confidence: number,
  status: string = "completed",
  errorMessage?: string
) {
  await db.insert(seoAgentActions).values({
    actionType,
    entityType,
    entityId,
    entityName,
    previousValue: JSON.stringify(previousValue),
    newValue: JSON.stringify(newValue),
    aiReasoning: reasoning,
    confidenceScore: confidence.toString(),
    status,
    errorMessage,
  });
}

async function updateAgentStatus(updates: Partial<{
  isRunning: boolean;
  lastRunAt: Date;
  nextScheduledRun: Date;
  totalProductsOptimized: number;
  totalBrandsOptimized: number;
  totalCategoriesOptimized: number;
  totalPagesOptimized: number;
  currentTask: string;
  errorCount: number;
  lastError: string;
}>) {
  const existing = await db.query.seoAgentStatus.findFirst();
  
  if (existing) {
    await db.update(seoAgentStatus)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(seoAgentStatus.id, existing.id));
  } else {
    await db.insert(seoAgentStatus).values({
      ...updates,
      updatedAt: new Date(),
    });
  }
}

async function processProductBatch(): Promise<number> {
  const productsNeedingSeo = await db.query.products.findMany({
    where: and(
      eq(products.isActive, true),
      or(
        isNull(products.metaTitle),
        isNull(products.metaDescription),
        isNull(products.slug),
        eq(products.metaTitle, ""),
        eq(products.metaDescription, ""),
        eq(products.slug, "")
      )
    ),
    with: {
      brand: true,
      category: true,
    },
    limit: BATCH_SIZE,
  });

  let processed = 0;

  for (const product of productsNeedingSeo) {
    try {
      const previousValue = {
        metaTitle: product.metaTitle,
        metaDescription: product.metaDescription,
        slug: product.slug,
      };

      const seoResult = await generateProductSeo(
        product.productName,
        product.brand?.name || null,
        product.category?.name || null,
        product.shortDescription || product.longDescription || null
      );

      let newSlug = product.slug || generateSlug(product.productName);
      
      if (!product.slug) {
        const isUnique = await checkSlugUnique(newSlug, "products", product.id);
        if (!isUnique) {
          newSlug = makeSlugUnique(newSlug, product.id);
        }
      }

      await db.update(products)
        .set({
          metaTitle: seoResult.metaTitle,
          metaDescription: seoResult.metaDescription,
          slug: newSlug,
        })
        .where(eq(products.id, product.id));

      await logAction(
        "product_seo",
        "product",
        product.id,
        product.productName,
        previousValue,
        { metaTitle: seoResult.metaTitle, metaDescription: seoResult.metaDescription, slug: newSlug },
        seoResult.reasoning,
        seoResult.confidence
      );

      processed++;
      console.log(`[SEO Agent] Optimized product: ${product.productName}`);

      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_ITEMS));
    } catch (error) {
      console.error(`[SEO Agent] Error processing product ${product.id}:`, error);
      await logAction(
        "product_seo",
        "product",
        product.id,
        product.productName,
        null,
        null,
        "",
        0,
        "failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  return processed;
}

async function processBrandBatch(): Promise<number> {
  const brandsNeedingSeo = await db.query.brands.findMany({
    where: and(
      eq(brands.isActive, true),
      or(
        isNull(brands.metaTitle),
        isNull(brands.metaDescription),
        isNull(brands.slug),
        eq(brands.metaTitle, ""),
        eq(brands.metaDescription, ""),
        eq(brands.slug, "")
      )
    ),
    limit: BATCH_SIZE,
  });

  let processed = 0;

  for (const brand of brandsNeedingSeo) {
    try {
      const productCount = await db.select({ count: sql<number>`count(*)` })
        .from(products)
        .where(eq(products.brandId, brand.id));

      const previousValue = {
        metaTitle: brand.metaTitle,
        metaDescription: brand.metaDescription,
        slug: brand.slug,
      };

      const seoResult = await generateBrandSeo(
        brand.name,
        brand.description,
        Number(productCount[0]?.count || 0)
      );

      const newSlug = brand.slug || generateSlug(brand.name);

      await db.update(brands)
        .set({
          metaTitle: seoResult.metaTitle,
          metaDescription: seoResult.metaDescription,
          slug: newSlug,
        })
        .where(eq(brands.id, brand.id));

      await logAction(
        "brand_seo",
        "brand",
        brand.id,
        brand.name,
        previousValue,
        { metaTitle: seoResult.metaTitle, metaDescription: seoResult.metaDescription, slug: newSlug },
        seoResult.reasoning,
        seoResult.confidence
      );

      processed++;
      console.log(`[SEO Agent] Optimized brand: ${brand.name}`);

      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_ITEMS));
    } catch (error) {
      console.error(`[SEO Agent] Error processing brand ${brand.id}:`, error);
    }
  }

  return processed;
}

async function processCategoryBatch(): Promise<number> {
  const categoriesNeedingSeo = await db.query.categories.findMany({
    where: and(
      eq(categories.isActive, true),
      or(
        isNull(categories.metaTitle),
        isNull(categories.metaDescription),
        isNull(categories.slug),
        eq(categories.metaTitle, ""),
        eq(categories.metaDescription, ""),
        eq(categories.slug, "")
      )
    ),
    limit: BATCH_SIZE,
  });

  let processed = 0;

  for (const category of categoriesNeedingSeo) {
    try {
      let parentCategory: string | null = null;
      if (category.parentId) {
        const parent = await db.query.categories.findFirst({
          where: eq(categories.id, category.parentId),
        });
        parentCategory = parent?.name || null;
      }

      const productCount = await db.select({ count: sql<number>`count(*)` })
        .from(products)
        .where(or(
          eq(products.categoryId, category.id),
          eq(products.subcategoryId, category.id)
        ));

      const previousValue = {
        metaTitle: category.metaTitle,
        metaDescription: category.metaDescription,
        slug: category.slug,
      };

      const seoResult = await generateCategorySeo(
        category.name,
        parentCategory,
        category.description,
        Number(productCount[0]?.count || 0)
      );

      const newSlug = category.slug || generateSlug(category.name);

      await db.update(categories)
        .set({
          metaTitle: seoResult.metaTitle,
          metaDescription: seoResult.metaDescription,
          slug: newSlug,
        })
        .where(eq(categories.id, category.id));

      await logAction(
        "category_seo",
        "category",
        category.id,
        category.name,
        previousValue,
        { metaTitle: seoResult.metaTitle, metaDescription: seoResult.metaDescription, slug: newSlug },
        seoResult.reasoning,
        seoResult.confidence
      );

      processed++;
      console.log(`[SEO Agent] Optimized category: ${category.name}`);

      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_ITEMS));
    } catch (error) {
      console.error(`[SEO Agent] Error processing category ${category.id}:`, error);
    }
  }

  return processed;
}

async function generateSiteRecommendations() {
  console.log("[SEO Agent] Generating site-wide SEO recommendations...");

  const analysis = await analyzeSite();

  for (const rec of analysis.recommendations) {
    const existing = await db.query.seoRecommendations.findFirst({
      where: and(
        eq(seoRecommendations.title, rec.title),
        eq(seoRecommendations.status, "pending")
      ),
    });

    if (!existing) {
      await db.insert(seoRecommendations).values({
        entityType: "site",
        entityId: null,
        entityName: "Pharma Oasis",
        recommendationType: rec.type,
        priority: rec.priority as "high" | "medium" | "low",
        title: rec.title,
        description: rec.description,
        suggestedAction: "Run SEO optimization batch to resolve",
        potentialImpact: rec.priority === "high" ? "high_traffic" : "medium_traffic",
        status: "pending",
      });
    }
  }
}

async function runFullOptimization() {
  if (isProcessorRunning) {
    console.log("[SEO Agent] Optimization already in progress (local), skipping...");
    return;
  }

  const canAcquire = await acquireLock();
  if (!canAcquire) {
    console.log("[SEO Agent] Optimization already in progress (database lock), skipping...");
    return;
  }

  isProcessorRunning = true;
  console.log("[SEO Agent] Starting full SEO optimization run...");

  try {
    await updateAgentStatus({
      isRunning: true,
      lastRunAt: new Date(),
      currentTask: "Analyzing website",
    });

    const analysis = await analyzeSite();
    console.log(`[SEO Agent] Site analysis complete:
      - Products: ${analysis.productsWithSeo}/${analysis.totalProducts} optimized
      - Brands: ${analysis.brandsWithSeo}/${analysis.totalBrands} optimized
      - Categories: ${analysis.categoriesWithSeo}/${analysis.totalCategories} optimized`);

    await updateAgentStatus({ currentTask: "Optimizing products" });
    const productsOptimized = await processProductBatch();

    await updateAgentStatus({ currentTask: "Optimizing brands" });
    const brandsOptimized = await processBrandBatch();

    await updateAgentStatus({ currentTask: "Optimizing categories" });
    const categoriesOptimized = await processCategoryBatch();

    await updateAgentStatus({ currentTask: "Generating recommendations" });
    await generateSiteRecommendations();

    const status = await db.query.seoAgentStatus.findFirst();
    const nextRun = new Date();
    nextRun.setHours(nextRun.getHours() + RUN_INTERVAL_HOURS);

    await updateAgentStatus({
      isRunning: false,
      currentTask: "Idle - waiting for next scheduled run",
      nextScheduledRun: nextRun,
      totalProductsOptimized: (status?.totalProductsOptimized || 0) + productsOptimized,
      totalBrandsOptimized: (status?.totalBrandsOptimized || 0) + brandsOptimized,
      totalCategoriesOptimized: (status?.totalCategoriesOptimized || 0) + categoriesOptimized,
    });

    console.log(`[SEO Agent] Optimization complete:
      - Products optimized: ${productsOptimized}
      - Brands optimized: ${brandsOptimized}
      - Categories optimized: ${categoriesOptimized}
      - Next run: ${nextRun.toISOString()}`);

  } catch (error) {
    console.error("[SEO Agent] Error during optimization:", error);
    const currentStatus = await db.query.seoAgentStatus.findFirst();
    await updateAgentStatus({
      isRunning: false,
      currentTask: "Error occurred",
      lastError: error instanceof Error ? error.message : "Unknown error",
      errorCount: (currentStatus?.errorCount || 0) + 1,
    });
  } finally {
    isProcessorRunning = false;
  }
}

export async function startSeoAgent() {
  if (processorInterval) {
    console.log("[SEO Agent] Agent is already running");
    return;
  }

  console.log(`[SEO Agent] Starting background processor (every ${RUN_INTERVAL_HOURS} hours)`);

  await runFullOptimization();

  processorInterval = setInterval(
    runFullOptimization,
    RUN_INTERVAL_HOURS * 60 * 60 * 1000
  );

  const nextRun = new Date();
  nextRun.setHours(nextRun.getHours() + RUN_INTERVAL_HOURS);

  await updateAgentStatus({
    isRunning: false,
    nextScheduledRun: nextRun,
    currentTask: "Scheduled - waiting for next run",
  });
}

export async function stopSeoAgent() {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
    isProcessorRunning = false;

    await updateAgentStatus({
      isRunning: false,
      currentTask: "Stopped by admin",
      nextScheduledRun: undefined,
    });

    console.log("[SEO Agent] Agent stopped");
  }
}

export async function runManualOptimization() {
  if (isProcessorRunning) {
    return { success: false, message: "Optimization already in progress" };
  }

  runFullOptimization();
  return { success: true, message: "Manual optimization started" };
}

export async function getSeoAgentStatus() {
  const status = await db.query.seoAgentStatus.findFirst();
  const analysis = await analyzeSite();

  const recentActions = await db.query.seoAgentActions.findMany({
    orderBy: [desc(seoAgentActions.createdAt)],
    limit: 50,
  });

  const pendingRecommendations = await db.query.seoRecommendations.findMany({
    where: eq(seoRecommendations.status, "pending"),
    orderBy: [desc(seoRecommendations.priority)],
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const actionsToday = await db.select({ count: sql<number>`count(*)` })
    .from(seoAgentActions)
    .where(gt(seoAgentActions.createdAt, todayStart));

  return {
    status: status || {
      isRunning: false,
      lastRunAt: null,
      nextScheduledRun: null,
      totalProductsOptimized: 0,
      totalBrandsOptimized: 0,
      totalCategoriesOptimized: 0,
      totalPagesOptimized: 0,
      currentTask: "Not started",
      errorCount: 0,
    },
    analysis,
    recentActions,
    pendingRecommendations,
    actionsToday: Number(actionsToday[0]?.count || 0),
    isScheduled: !!processorInterval,
  };
}

export async function getActionHistory(limit: number = 100, offset: number = 0) {
  const actions = await db.query.seoAgentActions.findMany({
    orderBy: [desc(seoAgentActions.createdAt)],
    limit,
    offset,
  });

  const total = await db.select({ count: sql<number>`count(*)` })
    .from(seoAgentActions);

  return {
    actions,
    total: Number(total[0]?.count || 0),
    limit,
    offset,
  };
}
