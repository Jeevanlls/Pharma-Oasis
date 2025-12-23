import { db } from "./db";
import { uploadJobs, products } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

interface ProcessingQueue {
  jobs: number[];
  isProcessing: boolean;
}

const queue: ProcessingQueue = {
  jobs: [],
  isProcessing: false,
};

export async function queueUploadJob(jobId: number) {
  queue.jobs.push(jobId);
  processNextJob();
}

async function processNextJob() {
  if (queue.isProcessing || queue.jobs.length === 0) {
    return;
  }

  queue.isProcessing = true;
  const jobId = queue.jobs.shift()!;

  try {
    const [job] = await db.select().from(uploadJobs).where(eq(uploadJobs.id, jobId));
    
    if (!job || job.status !== "pending") {
      queue.isProcessing = false;
      processNextJob();
      return;
    }

    await db.update(uploadJobs)
      .set({ status: "processing", startedAt: new Date() })
      .where(eq(uploadJobs.id, jobId));

    if (job.jobType === "google_price_import") {
      await processGooglePriceImport(job);
    } else if (job.jobType === "product_import") {
      await processProductImport(job);
    }

  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error);
    await db.update(uploadJobs)
      .set({
        status: "failed",
        finishedAt: new Date(),
        summaryMessage: `Processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
      .where(eq(uploadJobs.id, jobId));
  } finally {
    queue.isProcessing = false;
    setImmediate(() => processNextJob());
  }
}

async function processGooglePriceImport(job: typeof uploadJobs.$inferSelect) {
  const errorDetails = job.errorDetails;
  if (!errorDetails) {
    await db.update(uploadJobs)
      .set({
        status: "failed",
        finishedAt: new Date(),
        summaryMessage: "No CSV data found in job",
      })
      .where(eq(uploadJobs.id, job.id));
    return;
  }

  let rows: Array<{ sku: string; googleFeedPrice: string }>;
  try {
    rows = JSON.parse(errorDetails);
  } catch {
    await db.update(uploadJobs)
      .set({
        status: "failed",
        finishedAt: new Date(),
        summaryMessage: "Invalid CSV data format",
      })
      .where(eq(uploadJobs.id, job.id));
    return;
  }

  const totalRows = rows.length;
  let processedRows = 0;
  let successCount = 0;
  let skippedCount = 0;
  const errors: Array<{ row: number; sku: string; error: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    processedRows++;

    try {
      const sku = row.sku?.toString().trim();
      const priceStr = row.googleFeedPrice?.toString().trim();

      if (!sku) {
        skippedCount++;
        continue;
      }

      if (!priceStr || priceStr === "") {
        skippedCount++;
        continue;
      }

      const price = parseFloat(priceStr);
      if (isNaN(price) || price < 0) {
        errors.push({ row: i + 2, sku, error: `Invalid price: ${priceStr}` });
        continue;
      }

      const [product] = await db.select({ id: products.id })
        .from(products)
        .where(eq(products.sku, sku));

      if (!product) {
        skippedCount++;
        continue;
      }

      await db.update(products)
        .set({ googleFeedPrice: price.toFixed(2), updatedAt: new Date() })
        .where(eq(products.id, product.id));

      successCount++;

      if (processedRows % 100 === 0) {
        await db.update(uploadJobs)
          .set({ processedRows, successCount, skippedCount, failureCount: errors.length })
          .where(eq(uploadJobs.id, job.id));
      }
    } catch (error) {
      errors.push({
        row: i + 2,
        sku: row.sku || "unknown",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const summary = `Processed ${totalRows} rows: ${successCount} updated, ${skippedCount} skipped, ${errors.length} errors`;

  await db.update(uploadJobs)
    .set({
      status: "completed",
      finishedAt: new Date(),
      totalRows,
      processedRows,
      successCount,
      skippedCount,
      failureCount: errors.length,
      summaryMessage: summary,
      errorDetails: errors.length > 0 ? JSON.stringify(errors) : null,
    })
    .where(eq(uploadJobs.id, job.id));
}

async function processProductImport(job: typeof uploadJobs.$inferSelect) {
  const errorDetails = job.errorDetails;
  if (!errorDetails) {
    await db.update(uploadJobs)
      .set({
        status: "failed",
        finishedAt: new Date(),
        summaryMessage: "No CSV data found in job",
      })
      .where(eq(uploadJobs.id, job.id));
    return;
  }

  let rows: Array<Record<string, string>>;
  try {
    rows = JSON.parse(errorDetails);
  } catch {
    await db.update(uploadJobs)
      .set({
        status: "failed",
        finishedAt: new Date(),
        summaryMessage: "Invalid CSV data format",
      })
      .where(eq(uploadJobs.id, job.id));
    return;
  }

  const totalRows = rows.length;
  let processedRows = 0;
  let successCount = 0;
  let skippedCount = 0;
  const errors: Array<{ row: number; sku: string; error: string }> = [];

  const { brands, categories } = await import("@shared/schema");

  const allBrands = await db.select().from(brands);
  const allCategories = await db.select().from(categories);

  const brandMap = new Map(allBrands.map(b => [b.name.toLowerCase(), b.id]));
  const categoryMap = new Map(allCategories.map(c => [c.name.toLowerCase(), { id: c.id, parentId: c.parentId }]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    processedRows++;

    try {
      const sku = row.sku?.toString().trim();
      const productName = row.productName?.toString().trim() || row.product_name?.toString().trim() || row.name?.toString().trim();
      const brandName = row.brand?.toString().trim();
      const categoryName = row.category?.toString().trim();

      if (!sku || !productName) {
        errors.push({ row: i + 2, sku: sku || "missing", error: "Missing required fields (sku, productName)" });
        continue;
      }

      const brandId = brandName ? brandMap.get(brandName.toLowerCase()) : null;
      if (!brandId) {
        errors.push({ row: i + 2, sku, error: `Brand not found: ${brandName}` });
        continue;
      }

      const categoryInfo = categoryName ? categoryMap.get(categoryName.toLowerCase()) : null;
      if (!categoryInfo) {
        errors.push({ row: i + 2, sku, error: `Category not found: ${categoryName}` });
        continue;
      }

      const subcategoryName = row.subcategory?.toString().trim();
      let subcategoryId: number | null = null;
      if (subcategoryName) {
        const subInfo = categoryMap.get(subcategoryName.toLowerCase());
        if (subInfo) {
          subcategoryId = subInfo.id;
        }
      }

      const existingProduct = await db.select({ id: products.id })
        .from(products)
        .where(eq(products.sku, sku));

      const productData = {
        sku,
        productName,
        brandId,
        categoryId: categoryInfo.parentId || categoryInfo.id,
        subcategoryId: subcategoryId || categoryInfo.id,
        ean: row.ean?.toString().trim() || null,
        packSize: row.packSize?.toString().trim() || row.pack_size?.toString().trim() || null,
        wholesalePrice: row.wholesalePrice ? parseFloat(row.wholesalePrice).toFixed(2) : null,
        rrp: row.rrp ? parseFloat(row.rrp).toFixed(2) : null,
        moq: row.moq ? parseInt(row.moq, 10) : 1,
        shortDescription: row.shortDescription?.toString() || row.description?.toString() || null,
        imageUrl: row.imageUrl?.toString().trim() || row.image?.toString().trim() || null,
        isActive: true,
        updatedAt: new Date(),
      };

      if (existingProduct.length > 0) {
        await db.update(products)
          .set(productData)
          .where(eq(products.id, existingProduct[0].id));
      } else {
        await db.insert(products).values(productData as any);
      }

      successCount++;

      if (processedRows % 100 === 0) {
        await db.update(uploadJobs)
          .set({ processedRows, successCount, skippedCount, failureCount: errors.length })
          .where(eq(uploadJobs.id, job.id));
      }
    } catch (error) {
      errors.push({
        row: i + 2,
        sku: row.sku || "unknown",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const summary = `Processed ${totalRows} rows: ${successCount} imported/updated, ${skippedCount} skipped, ${errors.length} errors`;

  await db.update(uploadJobs)
    .set({
      status: "completed",
      finishedAt: new Date(),
      totalRows,
      processedRows,
      successCount,
      skippedCount,
      failureCount: errors.length,
      summaryMessage: summary,
      errorDetails: errors.length > 0 ? JSON.stringify(errors) : null,
    })
    .where(eq(uploadJobs.id, job.id));
}

export async function checkPendingJobs() {
  const pendingJobs = await db.select({ id: uploadJobs.id })
    .from(uploadJobs)
    .where(eq(uploadJobs.status, "pending"));

  for (const job of pendingJobs) {
    if (!queue.jobs.includes(job.id)) {
      queue.jobs.push(job.id);
    }
  }

  if (pendingJobs.length > 0) {
    processNextJob();
  }
}
