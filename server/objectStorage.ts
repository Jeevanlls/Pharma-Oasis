import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

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
    this.bucketName = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || null;
  }

  isConfigured(): boolean {
    return !!this.bucketName;
  }

  getBucketName(): string {
    if (!this.bucketName) {
      throw new ObjectStorageConfigError(
        "Object Storage not configured. Please set up Object Storage in the Replit tools panel."
      );
    }
    return this.bucketName;
  }

  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });
      const stream = file.createReadStream();
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

  async uploadBuffer(buffer: Buffer, category: string, filename: string, contentType: string): Promise<string> {
    const bucketName = this.getBucketName();
    const objectId = randomUUID();
    const ext = filename.includes('.') ? filename.split('.').pop() : '';
    const objectName = `public/${category}/${objectId}${ext ? `.${ext}` : ''}`;

    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    
    await file.save(buffer, {
      metadata: {
        contentType,
      },
    });

    return `/objects/${category}/${objectId}${ext ? `.${ext}` : ''}`;
  }

  async getObjectFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const bucketName = this.getBucketName();
    const parts = objectPath.slice("/objects/".length);
    const objectName = `public/${parts}`;
    
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  async deleteObject(objectPath: string): Promise<void> {
    if (!objectPath.startsWith("/objects/")) {
      return;
    }

    try {
      const bucketName = this.getBucketName();
      const parts = objectPath.slice("/objects/".length);
      const objectName = `public/${parts}`;
      
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      
      if (exists) {
        await file.delete();
      }
    } catch (error) {
      if (error instanceof ObjectStorageConfigError) {
        return;
      }
      console.error("Error deleting object:", error);
    }
  }
}
