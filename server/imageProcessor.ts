import sharp from "sharp";
import path from "path";
import fs from "fs";

export interface ProcessedImage {
  filename: string;
  url: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
  thumbnailUrl?: string;
}

export interface ImagePreset {
  width: number;
  height: number;
  fit: keyof sharp.FitEnum;
  format: "jpeg" | "png" | "webp";
  quality: number;
  background?: { r: number; g: number; b: number; alpha: number };
}

const PRESETS: Record<string, ImagePreset> = {
  brand: {
    width: 200,
    height: 80,
    fit: "contain",
    format: "png",
    quality: 90,
    background: { r: 255, g: 255, b: 255, alpha: 0 },
  },
  product: {
    width: 600,
    height: 600,
    fit: "contain",
    format: "jpeg",
    quality: 85,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  },
  product_thumbnail: {
    width: 200,
    height: 200,
    fit: "contain",
    format: "jpeg",
    quality: 75,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  },
  hero: {
    width: 1920,
    height: 720,
    fit: "cover",
    format: "webp",
    quality: 80,
  },
  general: {
    width: 800,
    height: 600,
    fit: "inside",
    format: "jpeg",
    quality: 85,
  },
};

const UPLOADS_DIR = path.join(process.cwd(), "attached_assets", "uploads");

function ensureUploadsDirExists(): void {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function generateFilename(originalName: string, category: string, preset: ImagePreset): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const baseName = path.basename(originalName, path.extname(originalName))
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .substring(0, 50);
  return `${category}-${baseName}-${timestamp}-${randomSuffix}.${preset.format}`;
}

export async function processImage(
  buffer: Buffer,
  originalFilename: string,
  category: string
): Promise<ProcessedImage> {
  ensureUploadsDirExists();

  const preset = PRESETS[category] || PRESETS.general;
  const filename = generateFilename(originalFilename, category, preset);
  const outputPath = path.join(UPLOADS_DIR, filename);

  let transformer = sharp(buffer)
    .resize(preset.width, preset.height, {
      fit: preset.fit,
      background: preset.background || { r: 255, g: 255, b: 255, alpha: 1 },
    });

  if (preset.format === "jpeg") {
    transformer = transformer.jpeg({ quality: preset.quality });
  } else if (preset.format === "png") {
    transformer = transformer.png({ quality: preset.quality });
  } else if (preset.format === "webp") {
    transformer = transformer.webp({ quality: preset.quality });
  }

  await transformer.toFile(outputPath);

  const metadata = await sharp(outputPath).metadata();
  const stats = fs.statSync(outputPath);

  const result: ProcessedImage = {
    filename,
    url: `/attached_assets/uploads/${filename}`,
    width: metadata.width || preset.width,
    height: metadata.height || preset.height,
    fileSize: stats.size,
    mimeType: `image/${preset.format}`,
  };

  if (category === "product") {
    const thumbnailPreset = PRESETS.product_thumbnail;
    const thumbnailFilename = generateFilename(originalFilename, "product_thumb", thumbnailPreset);
    const thumbnailPath = path.join(UPLOADS_DIR, thumbnailFilename);

    await sharp(buffer)
      .resize(thumbnailPreset.width, thumbnailPreset.height, {
        fit: thumbnailPreset.fit,
        background: thumbnailPreset.background,
      })
      .jpeg({ quality: thumbnailPreset.quality })
      .toFile(thumbnailPath);

    result.thumbnailUrl = `/attached_assets/uploads/${thumbnailFilename}`;
  }

  return result;
}

export async function deleteImageFile(url: string): Promise<void> {
  if (!url.startsWith("/attached_assets/uploads/")) return;
  
  const filename = path.basename(url);
  const filePath = path.join(UPLOADS_DIR, filename);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function getImageCategories(): string[] {
  return Object.keys(PRESETS).filter(k => !k.includes("thumbnail"));
}

export function isValidImageCategory(category: string): boolean {
  return getImageCategories().includes(category);
}

export function validateImageFile(
  mimeType: string,
  fileSize: number
): { valid: boolean; error?: string } {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const maxSize = 10 * 1024 * 1024;

  if (!allowedTypes.includes(mimeType)) {
    return { valid: false, error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" };
  }

  if (fileSize > maxSize) {
    return { valid: false, error: "File too large. Maximum size: 10MB" };
  }

  return { valid: true };
}
