import { db, pool } from "./db";
import { importJobs, importJobLines, products, brands, categories } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { storage } from "./storage"; // Used for brand/category creation

const BATCH_SIZE = 50;
const PROCESS_INTERVAL = 2000; // 2 seconds between batches
let isProcessing = false;
let processorInterval: NodeJS.Timeout | null = null;

interface ProductRow {
  sku: string;
  productName: string;
  brand: string;
  category: string;
  subcategory?: string;
  ean?: string;
  shortDescription?: string;
  longDescription?: string;
  packSize?: string;
  caseSize?: string;
  uom?: string;
  rrp?: string;
  wholesalePrice?: string;
  moq?: string;
  vatRate?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  imageUrl?: string;
  countryOfOrigin?: string;
  productType?: string;
  storageConditions?: string;
}

// Pre-fetch all brands and categories for fast lookup
async function buildLookupMaps() {
  const allBrands = await db.select().from(brands);
  const allCategories = await db.select().from(categories);
  
  const brandMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();
  const subcategoryMap = new Map<string, Map<string, number>>();
  
  for (const b of allBrands) {
    brandMap.set(b.name.toLowerCase(), b.id);
  }
  
  for (const c of allCategories) {
    if (c.parentId === null) {
      categoryMap.set(c.name.toLowerCase(), c.id);
    } else {
      if (!subcategoryMap.has(c.parentId.toString())) {
        subcategoryMap.set(c.parentId.toString(), new Map());
      }
      subcategoryMap.get(c.parentId.toString())!.set(c.name.toLowerCase(), c.id);
    }
  }
  
  return { brandMap, categoryMap, subcategoryMap };
}

async function processLine(
  line: typeof importJobLines.$inferSelect,
  brandMap: Map<string, number>,
  categoryMap: Map<string, number>,
  subcategoryMap: Map<string, Map<string, number>>
): Promise<{ success: boolean; error?: string; productId?: number }> {
  try {
    const row: ProductRow = JSON.parse(line.payload);
    
    // Validate required fields
    if (!row.sku || !row.productName || !row.brand || !row.category) {
      return { success: false, error: "Missing required fields (sku, productName, brand, or category)" };
    }
    
    // Find or create brand
    let brandId = brandMap.get(row.brand.toLowerCase());
    if (!brandId) {
      const newBrand = await storage.createBrand({ name: row.brand, isActive: true });
      brandId = newBrand.id;
      brandMap.set(row.brand.toLowerCase(), brandId);
    }
    
    // Find or create category
    let categoryId = categoryMap.get(row.category.toLowerCase());
    if (!categoryId) {
      const newCategory = await storage.createCategory({ name: row.category, isActive: true });
      categoryId = newCategory.id;
      categoryMap.set(row.category.toLowerCase(), categoryId);
    }
    
    // Find or create subcategory if provided
    let subcategoryId: number | null = null;
    if (row.subcategory) {
      const parentSubcats = subcategoryMap.get(categoryId.toString()) || new Map();
      subcategoryId = parentSubcats.get(row.subcategory.toLowerCase()) || null;
      
      if (!subcategoryId) {
        const newSubcat = await storage.createCategory({ 
          name: row.subcategory, 
          parentId: categoryId,
          isActive: true 
        });
        subcategoryId = newSubcat.id;
        parentSubcats.set(row.subcategory.toLowerCase(), subcategoryId);
        subcategoryMap.set(categoryId.toString(), parentSubcats);
      }
    }
    
    // Use true UPSERT to avoid N+1 lookups
    const productPayload = {
      sku: row.sku,
      ean: row.ean || null,
      brandId,
      productName: row.productName,
      shortDescription: row.shortDescription || null,
      longDescription: row.longDescription || null,
      categoryId,
      subcategoryId,
      packSize: row.packSize || null,
      caseSize: row.caseSize || null,
      uom: row.uom || null,
      rrp: row.rrp || null,
      wholesalePrice: row.wholesalePrice || null,
      moq: row.moq ? Number(row.moq) : 1,
      vatRate: row.vatRate || null,
      isActive: row.isActive !== false,
      isFeatured: row.isFeatured === true,
      imageUrl: row.imageUrl || null,
      countryOfOrigin: row.countryOfOrigin || null,
      productType: row.productType || null,
      storageConditions: row.storageConditions || null,
      slug: row.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    };
    
    // INSERT ... ON CONFLICT(sku) DO UPDATE - single query, no prior lookup
    const [result] = await db
      .insert(products)
      .values(productPayload)
      .onConflictDoUpdate({
        target: products.sku,
        set: {
          ean: productPayload.ean,
          brandId: productPayload.brandId,
          productName: productPayload.productName,
          shortDescription: productPayload.shortDescription,
          longDescription: productPayload.longDescription,
          categoryId: productPayload.categoryId,
          subcategoryId: productPayload.subcategoryId,
          packSize: productPayload.packSize,
          caseSize: productPayload.caseSize,
          uom: productPayload.uom,
          rrp: productPayload.rrp,
          wholesalePrice: productPayload.wholesalePrice,
          moq: productPayload.moq,
          vatRate: productPayload.vatRate,
          isActive: productPayload.isActive,
          isFeatured: productPayload.isFeatured,
          imageUrl: productPayload.imageUrl,
          countryOfOrigin: productPayload.countryOfOrigin,
          productType: productPayload.productType,
          storageConditions: productPayload.storageConditions,
        }
      })
      .returning({ id: products.id });
    
    return { success: true, productId: result.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Unknown error" };
  }
}

async function processBatch() {
  if (isProcessing) return;
  isProcessing = true;
  
  try {
    // Find a job that needs processing
    const [job] = await db
      .select()
      .from(importJobs)
      .where(eq(importJobs.status, "queued"))
      .limit(1);
    
    if (!job) {
      // Check for any processing jobs that might need to continue
      const [processingJob] = await db
        .select()
        .from(importJobs)
        .where(eq(importJobs.status, "processing"))
        .limit(1);
      
      if (!processingJob) {
        isProcessing = false;
        return;
      }
      
      // Continue with the processing job
      await processJobBatch(processingJob);
    } else {
      // Start this job
      await db
        .update(importJobs)
        .set({ 
          status: "processing", 
          startedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(importJobs.id, job.id));
      
      console.log(`[Import Worker] Starting job ${job.id}: ${job.filename}`);
      await processJobBatch(job);
    }
  } catch (err) {
    console.error("[Import Worker] Error:", err);
  } finally {
    isProcessing = false;
  }
}

async function processJobBatch(job: typeof importJobs.$inferSelect) {
  // Build lookup maps for fast resolution
  const { brandMap, categoryMap, subcategoryMap } = await buildLookupMaps();
  
  // Get pending lines for this job
  const pendingLines = await db
    .select()
    .from(importJobLines)
    .where(and(
      eq(importJobLines.jobId, job.id),
      eq(importJobLines.status, "pending")
    ))
    .limit(BATCH_SIZE);
  
  if (pendingLines.length === 0) {
    // Job complete
    await db
      .update(importJobs)
      .set({ 
        status: "completed",
        finishedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(importJobs.id, job.id));
    
    console.log(`[Import Worker] Job ${job.id} completed`);
    return;
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const line of pendingLines) {
    const result = await processLine(line, brandMap, categoryMap, subcategoryMap);
    
    if (result.success) {
      successCount++;
      await db
        .update(importJobLines)
        .set({ 
          status: "success",
          productId: result.productId
        })
        .where(eq(importJobLines.id, line.id));
    } else {
      errorCount++;
      await db
        .update(importJobLines)
        .set({ 
          status: "error",
          errorMessage: result.error
        })
        .where(eq(importJobLines.id, line.id));
    }
  }
  
  // Update job progress
  await db
    .update(importJobs)
    .set({ 
      processedRows: sql`${importJobs.processedRows} + ${pendingLines.length}`,
      successCount: sql`${importJobs.successCount} + ${successCount}`,
      errorCount: sql`${importJobs.errorCount} + ${errorCount}`,
      updatedAt: new Date()
    })
    .where(eq(importJobs.id, job.id));
  
  console.log(`[Import Worker] Job ${job.id}: processed ${pendingLines.length} rows (${successCount} success, ${errorCount} errors)`);
}

export function startImportProcessor() {
  if (processorInterval) return;
  
  console.log("[Import Worker] Starting background processor");
  processorInterval = setInterval(processBatch, PROCESS_INTERVAL);
  
  // Run immediately
  processBatch();
}

export function stopImportProcessor() {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
    console.log("[Import Worker] Stopped background processor");
  }
}

// Create a new import job from CSV data
export async function createImportJob(
  userId: number,
  filename: string,
  rows: ProductRow[]
): Promise<number> {
  // Create the job
  const [job] = await db
    .insert(importJobs)
    .values({
      userId,
      filename,
      totalRows: rows.length,
      status: "queued"
    })
    .returning();
  
  // Insert all lines
  const lineValues = rows.map((row, index) => ({
    jobId: job.id,
    rowNumber: index + 2, // +2 because row 1 is headers
    payload: JSON.stringify(row),
    status: "pending" as const
  }));
  
  // Batch insert lines (100 at a time to avoid query size limits)
  for (let i = 0; i < lineValues.length; i += 100) {
    const batch = lineValues.slice(i, i + 100);
    await db.insert(importJobLines).values(batch);
  }
  
  console.log(`[Import Worker] Created job ${job.id} with ${rows.length} rows`);
  
  // Ensure processor is running
  startImportProcessor();
  
  return job.id;
}

// Get job status
export async function getImportJob(jobId: number) {
  const [job] = await db
    .select()
    .from(importJobs)
    .where(eq(importJobs.id, jobId));
  
  return job;
}

// Get all jobs for a user
export async function getImportJobs(userId?: number, limit = 20) {
  if (userId) {
    return db
      .select()
      .from(importJobs)
      .where(eq(importJobs.userId, userId))
      .orderBy(sql`${importJobs.createdAt} DESC`)
      .limit(limit);
  }
  
  return db
    .select()
    .from(importJobs)
    .orderBy(sql`${importJobs.createdAt} DESC`)
    .limit(limit);
}

// Get error lines for a job
export async function getImportJobErrors(jobId: number) {
  return db
    .select()
    .from(importJobLines)
    .where(and(
      eq(importJobLines.jobId, jobId),
      eq(importJobLines.status, "error")
    ))
    .orderBy(importJobLines.rowNumber);
}

// Retry failed lines
export async function retryImportJobErrors(jobId: number): Promise<number> {
  // Reset error lines to pending
  const result = await db
    .update(importJobLines)
    .set({ 
      status: "pending",
      errorMessage: null
    })
    .where(and(
      eq(importJobLines.jobId, jobId),
      eq(importJobLines.status, "error")
    ));
  
  // Get count of reset lines
  const errors = await db
    .select({ count: sql<number>`count(*)` })
    .from(importJobLines)
    .where(and(
      eq(importJobLines.jobId, jobId),
      eq(importJobLines.status, "pending")
    ));
  
  // Reset job to processing
  await db
    .update(importJobs)
    .set({ 
      status: "processing",
      errorCount: 0,
      updatedAt: new Date()
    })
    .where(eq(importJobs.id, jobId));
  
  // Ensure processor is running
  startImportProcessor();
  
  return errors[0]?.count || 0;
}
