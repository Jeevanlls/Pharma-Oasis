import { Response } from "express";
import { randomUUID } from "crypto";
import type { Readable } from "stream";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// Cloudflare R2 is S3-compatible. Configure via environment:
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
//   (optional) R2_ENDPOINT to override the derived endpoint.
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET =
  process.env.R2_BUCKET || process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || "";
const R2_ENDPOINT =
  process.env.R2_ENDPOINT ||
  (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : "");

const s3: S3Client | null =
  R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
    ? new S3Client({
        region: "auto",
        endpoint: R2_ENDPOINT,
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
      })
    : null;

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ObjectStorageConfigError";
    Object.setPrototypeOf(this, ObjectStorageConfigError.prototype);
  }
}

export class ObjectStorageService {
  private bucketName: string | null = null;

  constructor() {
    this.bucketName = R2_BUCKET || null;
  }

  isConfigured(): boolean {
    return !!(this.bucketName && s3);
  }

  getBucketName(): string {
    if (!this.bucketName || !s3) {
      throw new ObjectStorageConfigError(
        "Object Storage not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET.",
      );
    }
    return this.bucketName;
  }

  // Streams an object (identified by its storage key) to the HTTP response.
  async downloadObject(objectKey: string, res: Response, cacheTtlSec: number = 3600) {
    const bucket = this.getBucketName();
    try {
      const head = await s3!.send(
        new HeadObjectCommand({ Bucket: bucket, Key: objectKey }),
      );
      res.set({
        "Content-Type": head.ContentType || "application/octet-stream",
        ...(head.ContentLength != null
          ? { "Content-Length": String(head.ContentLength) }
          : {}),
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });
      const obj = await s3!.send(
        new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
      );
      const stream = obj.Body as Readable;
      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    category: string,
    filename: string,
    contentType: string,
  ): Promise<string> {
    const bucket = this.getBucketName();
    const objectId = randomUUID();
    const ext = filename.includes(".") ? filename.split(".").pop() : "";
    const objectName = `public/${category}/${objectId}${ext ? `.${ext}` : ""}`;

    await s3!.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectName,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return `/objects/${category}/${objectId}${ext ? `.${ext}` : ""}`;
  }

  // Resolves a public "/objects/..." path to a verified storage key.
  async getObjectFile(objectPath: string): Promise<string> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const bucket = this.getBucketName();
    const parts = objectPath.slice("/objects/".length);
    const objectName = `public/${parts}`;
    try {
      await s3!.send(new HeadObjectCommand({ Bucket: bucket, Key: objectName }));
    } catch {
      throw new ObjectNotFoundError();
    }
    return objectName;
  }

  async deleteObject(objectPath: string): Promise<void> {
    if (!objectPath.startsWith("/objects/")) {
      return;
    }
    try {
      const bucket = this.getBucketName();
      const parts = objectPath.slice("/objects/".length);
      const objectName = `public/${parts}`;
      await s3!.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: objectName }),
      );
    } catch (error) {
      if (error instanceof ObjectStorageConfigError) {
        return;
      }
      console.error("Error deleting object:", error);
    }
  }
}
