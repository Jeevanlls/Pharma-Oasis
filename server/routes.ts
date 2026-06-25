import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { db } from "./db";
import { 
  loginSchema, 
  customerRegistrationSchema, 
  supplierRegistrationSchema,
  contactFormSchema,
  insertProductSchema,
  profileUpdateSchema,
  uploadJobs,
  insertBlogPostSchema,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import {
  generateSecret as gen2faSecret,
  buildOtpauthUrl,
  verifyToken as verify2faToken,
  generateBackupCodes,
  consumeBackupCode,
} from "./twofa";
import { z } from "zod";
import { processImage, deleteImageFile, validateImageFile, getImageCategories, isValidImageCategory } from "./imageProcessor";
import { ObjectStorageService, ObjectNotFoundError, ObjectStorageConfigError } from "./objectStorage";
import {
  sendCustomerRegistrationNotification,
  sendSupplierRegistrationNotification,
  sendContactFormNotification,
  sendQuoteSubmissionNotification,
  sendQuoteConfirmationToCustomer,
  sendAccountApprovalEmail,
  sendAccountRejectionEmail,
  sendRegistrationConfirmationToUser,
  sendContactFormConfirmation,
  sendSupplierConfirmation,
  sendOrderSubmissionNotification,
  sendOrderConfirmationToCustomer,
  sendCustomerResponseEmail,
} from "./email";
import { sessionMiddleware } from "./session-store";
import feedsRouter from "./feeds";
import { parseCostFile, buildPreview, analyzeRows, buildTemplateWorkbook } from "./cost-importer";
import type { ParsedCostRow } from "./cost-importer";
import * as pricingStore from "./pricing-store";
import * as pricingV2 from "./pricing-v2";
import { resolveForList, toCustomerPrice } from "./pricing";
import { buildPriceListData, buildCustomerPriceListData, buildPriceListXlsx, buildPriceListPdf } from "./price-export";
import {
  createImportJob, 
  getImportJob, 
  getImportJobs, 
  getImportJobErrors,
  retryImportJobErrors,
  startImportProcessor 
} from "./import-processor";

declare module "express-session" {
  interface SessionData {
    userId: number;
    // Set after a correct admin password but before the 2FA code is verified.
    // The full session (userId) is only granted once 2FA passes.
    pending2faUserId?: number;
  }
}

// Strip secrets before returning a user to any client. Never expose the password
// hash, the TOTP secret, or backup codes.
function publicUser(user: any) {
  if (!user) return user;
  const { passwordHash, twoFactorSecret, twoFactorBackupCodes, ...rest } = user;
  return rest;
}

export async function registerRoutes(server: Server, app: Express): Promise<void> {
  // Trust proxy for production (required behind reverse proxies like Replit)
  app.set("trust proxy", 1);

  // Session middleware with PostgreSQL store
  app.use(sessionMiddleware);

  // ==================== RATE LIMITERS ====================
  const chatSessionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many chat sessions created from this IP. Please try again later." },
  });

  const chatMessageLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many messages sent from this IP. Please wait a few minutes before sending more." },
  });

  // Helper: extract real visitor IP (handles proxies)
  const getVisitorIp = (req: any): string => {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) {
      return (typeof forwarded === "string" ? forwarded : forwarded[0]).split(",")[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || "unknown";
  };

  // Root-level SEO routes (for Googlebot compliance)
  app.get("/robots.txt", (req, res, next) => {
    req.url = "/feeds/robots.txt";
    next();
  });
  app.get("/sitemap.xml", (req, res, next) => {
    req.url = "/feeds/sitemap.xml";
    next();
  });

  // SEO Feeds (sitemap, Google Shopping, robots.txt)
  app.use("/feeds", feedsRouter);

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    req.user = user;
    next();
  };

  const requireActiveCustomer = async (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    if (user.role !== "admin" && (user.role !== "customer" || user.status !== "active")) {
      return res.status(403).json({ message: "Active customer account required" });
    }
    req.user = user;
    next();
  };

  const requireStaffOrAdmin = async (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || (user.role !== "admin" && user.role !== "staff")) {
      return res.status(403).json({ message: "Staff or admin access required" });
    }
    req.user = user;
    next();
  };

  // ==================== OBJECT STORAGE - SERVE UPLOADED IMAGES ====================
  app.get("/objects/*", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      if (!objectStorageService.isConfigured()) {
        return res.status(503).json({ error: "Object Storage not configured" });
      }
      const objectFile = await objectStorageService.getObjectFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File not found" });
      }
      if (error instanceof ObjectStorageConfigError) {
        return res.status(503).json({ error: "Object Storage not configured" });
      }
      console.error("Error serving object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== AUTH ROUTES ====================
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json({ user: publicUser(user) });
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (user.status === "pending") {
        return res.status(403).json({ message: "Your account is pending approval. Please wait for our team to review your application." });
      }

      if (user.status === "rejected") {
        return res.status(403).json({ message: "Your account application was not approved. Please contact support for more information." });
      }

      // Two-factor gate for admins. Password is correct at this point, but we do
      // NOT grant the session yet — we stash a pending id and require a second step.
      if (user.role === "admin") {
        if ((user as any).twoFactorEnabled) {
          // 2FA is set up → require an authenticator code.
          req.session.regenerate((err) => {
            if (err) {
              console.error("Session regeneration error:", err);
              return res.status(500).json({ message: "Login failed" });
            }
            req.session.pending2faUserId = user.id;
            return res.json({ twoFactorRequired: true });
          });
          return;
        }
        // Admin without 2FA yet → must set it up before getting in (required for admins).
        req.session.regenerate((err) => {
          if (err) {
            console.error("Session regeneration error:", err);
            return res.status(500).json({ message: "Login failed" });
          }
          req.session.pending2faUserId = user.id;
          return res.json({ twoFactorSetupRequired: true });
        });
        return;
      }

      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        req.session.userId = user.id;
        res.json({ user: publicUser(user) });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = customerRegistrationSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const passwordHash = await bcrypt.hash(data.password, 10);
      
      const user = await storage.createUser({
        email: data.email,
        passwordHash,
        role: "customer",
        status: "pending",
        businessType: data.businessType,
        companyName: data.companyName,
        tradingName: data.tradingName || null,
        gphcNumber: data.gphcNumber || null,
        companyRegistrationNumber: data.companyRegistrationNumber || null,
        vatNumber: data.vatNumber || null,
        primaryContactName: data.primaryContactName,
        jobTitle: data.jobTitle || null,
        phoneNumber: data.phoneNumber,
        mobileNumber: data.mobileNumber || null,
        billingAddressLine1: data.billingAddressLine1,
        billingAddressLine2: data.billingAddressLine2 || null,
        billingCity: data.billingCity,
        billingPostcode: data.billingPostcode,
        billingCountry: data.billingCountry,
        deliverySameAsBilling: data.deliverySameAsBilling,
        deliveryAddressLine1: data.deliveryAddressLine1 || null,
        deliveryAddressLine2: data.deliveryAddressLine2 || null,
        deliveryCity: data.deliveryCity || null,
        deliveryPostcode: data.deliveryPostcode || null,
        deliveryCountry: data.deliveryCountry || null,
        mhraLicenceType: data.mhraLicenceType || null,
        mhraLicenceNumber: data.mhraLicenceNumber || null,
        responsiblePersonName: data.responsiblePersonName || null,
        responsiblePersonEmail: data.responsiblePersonEmail || null,
        coldChainCapability: data.coldChainCapability,
        interestedInControlledProducts: data.interestedInControlledProducts,
        estimatedMonthlySpend: data.estimatedMonthlySpend || null,
        orderingContactEmail: data.orderingContactEmail || null,
        accountsPayableEmail: data.accountsPayableEmail || null,
        preferredOrderMethod: data.preferredOrderMethod || null,
        howDidYouHear: data.howDidYouHear || null,
        notes: data.notes || null,
        marketingConsent: data.marketingConsent,
      });

      await sendCustomerRegistrationNotification({
        email: data.email,
        companyName: data.companyName,
        contactName: data.primaryContactName,
        phone: data.phoneNumber,
      });

      await sendRegistrationConfirmationToUser({
        email: data.email,
        contactName: data.primaryContactName,
        companyName: data.companyName,
      });
      
      res.status(201).json({ message: "Registration successful. Your account is pending approval." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Forgot password — generate token and send email
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }

      // Always return 200 to avoid revealing whether an account exists
      const user = await storage.getUserByEmail(email.toLowerCase().trim());
      if (!user) {
        return res.json({ message: "If an account exists, a reset link has been sent." });
      }

      const crypto = await import("node:crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await storage.updateUser(user.id, {
        passwordResetToken: token,
        passwordResetExpiry: expiry,
      } as any);

      const SITE_URL = process.env.SITE_URL || "https://pharmaoasis.co.uk";
      const resetUrl = `${SITE_URL}/reset-password?token=${token}`;

      const { sendPasswordResetEmail } = await import("./email");
      await sendPasswordResetEmail({
        email: user.email,
        contactName: user.primaryContactName || user.companyName || "Customer",
        resetUrl,
      });

      console.log(`[Password Reset] Token generated for ${user.email}, expires ${expiry.toISOString()}`);
      res.json({ message: "If an account exists, a reset link has been sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request. Please try again." });
    }
  });

  // Reset password — validate token and update password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "This reset link is invalid or has already been used." });
      }

      const expiry = (user as any).passwordResetExpiry;
      if (!expiry || new Date(expiry) < new Date()) {
        return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      await storage.updateUser(user.id, {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      } as any);

      console.log(`[Password Reset] Password updated for ${user.email}`);
      res.json({ message: "Password updated successfully." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password. Please try again." });
    }
  });

  // ==================== TWO-FACTOR AUTH (TOTP) — admins ====================
  // Throttle code-guessing on the second login step and on enable.
  const twoFaLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many attempts. Please wait a few minutes and try again." },
  });

  // Resolve the admin currently allowed to manage 2FA: either a fully-authed admin,
  // or one mid-login who has passed the password step (pending2faUserId).
  const getEnrollingAdmin = async (req: any) => {
    const id = req.session.userId || req.session.pending2faUserId;
    if (!id) return null;
    const user = await storage.getUser(id);
    if (!user || user.role !== "admin") return null;
    return user;
  };

  // Step 2 of login: verify the authenticator code (or a backup code).
  app.post("/api/auth/login/2fa", twoFaLimiter, async (req, res) => {
    try {
      const pendingId = req.session.pending2faUserId;
      if (!pendingId) {
        return res.status(401).json({ message: "No login in progress. Please sign in again." });
      }
      const code = String(req.body?.code || "").trim();
      if (!code) return res.status(400).json({ message: "Enter your 6-digit code or a backup code." });

      const user = await storage.getUser(pendingId);
      if (!user || !(user as any).twoFactorEnabled || !(user as any).twoFactorSecret) {
        return res.status(400).json({ message: "Two-factor is not set up for this account." });
      }

      let verified = verify2faToken(code, (user as any).twoFactorSecret);

      // Fall back to single-use backup codes.
      if (!verified) {
        const consumed = await consumeBackupCode(code, (user as any).twoFactorBackupCodes);
        if (consumed) {
          verified = true;
          await storage.updateUser(user.id, { twoFactorBackupCodes: consumed.remainingJson } as any);
        }
      }

      if (!verified) {
        return res.status(401).json({ message: "That code wasn't valid. Try again." });
      }

      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        req.session.userId = user.id;
        res.json({ user: publicUser(user) });
      });
    } catch (error) {
      console.error("2FA verify error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Begin 2FA setup: generate a secret + QR for the authenticator app.
  // Works for a logged-in admin OR an admin mid-login who must enrol.
  app.post("/api/admin/2fa/setup", async (req, res) => {
    try {
      const user = await getEnrollingAdmin(req);
      if (!user) return res.status(401).json({ message: "Admin sign-in required." });

      const secret = gen2faSecret();
      // Store as the (not-yet-enabled) secret; enable only after a code is confirmed.
      await storage.updateUser(user.id, { twoFactorSecret: secret } as any);

      const otpauthUrl = buildOtpauthUrl(user.email, secret);
      const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
      res.json({ secret, otpauthUrl, qrDataUrl });
    } catch (error) {
      console.error("2FA setup error:", error);
      res.status(500).json({ message: "Could not start 2FA setup." });
    }
  });

  // Confirm setup: verify the first code, enable 2FA, return one-time backup codes.
  // If the admin was mid-login (enrolment forced), also completes the login.
  app.post("/api/admin/2fa/enable", twoFaLimiter, async (req, res) => {
    try {
      const user = await getEnrollingAdmin(req);
      if (!user) return res.status(401).json({ message: "Admin sign-in required." });

      const secret = (user as any).twoFactorSecret;
      if (!secret) return res.status(400).json({ message: "Start setup first." });

      const code = String(req.body?.code || "").trim();
      if (!verify2faToken(code, secret)) {
        return res.status(400).json({ message: "That code wasn't valid. Check your app and try again." });
      }

      const { plain, hashedJson } = await generateBackupCodes(10);
      await storage.updateUser(user.id, {
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedJson,
      } as any);

      // Complete login if this was a forced first-time enrolment.
      const wasPending = !req.session.userId && req.session.pending2faUserId === user.id;
      if (wasPending) {
        req.session.regenerate((err) => {
          if (err) {
            console.error("Session regeneration error:", err);
            return res.status(500).json({ message: "Login failed" });
          }
          req.session.userId = user.id;
          res.json({ enabled: true, backupCodes: plain, user: publicUser({ ...user, twoFactorEnabled: true }) });
        });
        return;
      }
      res.json({ enabled: true, backupCodes: plain });
    } catch (error) {
      console.error("2FA enable error:", error);
      res.status(500).json({ message: "Could not enable 2FA." });
    }
  });

  // Turn 2FA off (requires the account password as confirmation).
  app.post("/api/admin/2fa/disable", requireAdmin, async (req: any, res) => {
    try {
      const user = req.user;
      const password = String(req.body?.password || "");
      const ok = password && (await bcrypt.compare(password, user.passwordHash));
      if (!ok) return res.status(400).json({ message: "Password is incorrect." });

      await storage.updateUser(user.id, {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      } as any);
      res.json({ disabled: true });
    } catch (error) {
      console.error("2FA disable error:", error);
      res.status(500).json({ message: "Could not disable 2FA." });
    }
  });

  // Regenerate backup codes (requires the account password).
  app.post("/api/admin/2fa/backup-codes", requireAdmin, twoFaLimiter, async (req: any, res) => {
    try {
      const user = req.user;
      if (!(user as any).twoFactorEnabled) {
        return res.status(400).json({ message: "Enable 2FA first." });
      }
      const password = String(req.body?.password || "");
      const ok = password && (await bcrypt.compare(password, user.passwordHash));
      if (!ok) return res.status(400).json({ message: "Password is incorrect." });

      const { plain, hashedJson } = await generateBackupCodes(10);
      await storage.updateUser(user.id, { twoFactorBackupCodes: hashedJson } as any);
      res.json({ backupCodes: plain });
    } catch (error) {
      console.error("2FA backup-codes error:", error);
      res.status(500).json({ message: "Could not regenerate backup codes." });
    }
  });

  // Profile update endpoint for customers
  app.patch("/api/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Validate request body with strict schema
      const validatedData = profileUpdateSchema.parse(req.body);
      
      // Filter out undefined values
      const updates: Record<string, any> = {};
      for (const [key, value] of Object.entries(validatedData)) {
        if (value !== undefined) {
          updates[key] = value;
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const user = await storage.updateUser(userId, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user: publicUser(user) });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // ==================== PUBLIC PRODUCT ROUTES ====================
  app.get("/api/products", async (req, res) => {
    try {
      const { category, brand, search, featured, limit, offset, page } = req.query;
      
      const pageSize = limit ? Math.min(Number(limit), 100) : 24;
      const pageNum = page ? Math.max(1, Number(page)) : 1;
      const offsetNum = offset ? Number(offset) : (pageNum - 1) * pageSize;
      
      let productList: any[];
      let totalCount: number;
      
      const paginationOpts = { activeOnly: true, limit: pageSize, offset: offsetNum };
      
      if (search && typeof search === "string" && search.trim().length > 0) {
        // Use full-text search for better performance and relevance
        productList = await storage.searchProductsFullText(search, paginationOpts);
        totalCount = await storage.getProductCount({ activeOnly: true, search });
      } else if (category) {
        const categoryId = Number(category);
        productList = await storage.getProductsByCategory(categoryId, paginationOpts);
        totalCount = await storage.getProductCount({ activeOnly: true, categoryId });
      } else if (brand) {
        const brandId = Number(brand);
        productList = await storage.getProductsByBrand(brandId, paginationOpts);
        totalCount = await storage.getProductCount({ activeOnly: true, brandId });
      } else {
        productList = await storage.getAllProducts({
          activeOnly: true,
          featuredOnly: featured === "true",
          limit: pageSize,
          offset: offsetNum,
          page: pageNum,
        });
        totalCount = await storage.getProductCount({ activeOnly: true });
      }
      
      res.json({
        products: productList,
        pagination: {
          page: pageNum,
          pageSize,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        }
      });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/search", async (req, res) => {
    try {
      const query = (req.query.q as string || "").trim();
      const limit = Math.min(Number(req.query.limit) || 10, 50);
      if (!query) {
        return res.json([]);
      }
      const results = await storage.searchProductsFullText(query, { limit, offset: 0 });
      res.json(results);
    } catch (error) {
      console.error("Error searching products:", error);
      res.status(500).json({ message: "Failed to search products" });
    }
  });

  app.get("/api/products/:idOrSlug", async (req, res) => {
    try {
      const param = req.params.idOrSlug;
      let product;
      const id = Number(param);
      if (!isNaN(id) && Number.isInteger(id) && id > 0 && id <= 2147483647) {
        product = await storage.getProduct(id);
      }
      if (!product) {
        product = await storage.getProductBySlug(param);
      }
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      storage.trackProductView(product.id).catch(() => {});
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // ==================== PUBLIC BRAND & CATEGORY ROUTES ====================
  // In-memory cache for frequently accessed data
  let brandsCache: { data: any; timestamp: number } | null = null;
  let categoriesCache: { data: any; timestamp: number } | null = null;
  const CACHE_TTL = 60000; // 1 minute cache

  app.get("/api/brands", async (req, res) => {
    try {
      if (brandsCache && Date.now() - brandsCache.timestamp < CACHE_TTL) {
        res.set("Cache-Control", "public, max-age=60");
        return res.json(brandsCache.data);
      }
      const brandList = await storage.getAllBrands(true);
      brandsCache = { data: brandList, timestamp: Date.now() };
      res.set("Cache-Control", "public, max-age=60");
      res.json(brandList);
    } catch (error) {
      console.error("Error fetching brands:", error);
      res.status(500).json({ message: "Failed to fetch brands" });
    }
  });

  app.get("/api/categories", async (req, res) => {
    try {
      if (categoriesCache && Date.now() - categoriesCache.timestamp < CACHE_TTL) {
        res.set("Cache-Control", "public, max-age=60");
        return res.json(categoriesCache.data);
      }
      const categoryList = await storage.getAllCategories(true);
      categoriesCache = { data: categoryList, timestamp: Date.now() };
      res.set("Cache-Control", "public, max-age=60");
      res.json(categoryList);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // ==================== SUPPLIER REGISTRATION ====================
  app.post("/api/supplier-leads", async (req, res) => {
    try {
      const data = supplierRegistrationSchema.parse(req.body);
      
      const lead = await storage.createSupplierLead({
        status: "new",
        companyName: data.companyName,
        tradingName: data.tradingName || null,
        website: data.website || null,
        country: data.country,
        businessType: data.businessType,
        contactName: data.contactName,
        jobTitle: data.jobTitle || null,
        email: data.email,
        phoneNumber: data.phoneNumber,
        mhraGdpLicences: data.mhraGdpLicences || null,
        gdpAccredited: data.gdpAccredited,
        productCategoriesSupply: data.productCategoriesSupply,
        brandNamesRepresent: data.brandNamesRepresent,
        licensedUkEu: data.licensedUkEu || null,
        exclusivityInterest: data.exclusivityInterest,
        stockLocations: data.stockLocations || null,
        minimumOrderQuantities: data.minimumOrderQuantities || null,
        logisticsCapability: data.logisticsCapability || null,
        proposalSummary: data.proposalSummary,
        additionalNotes: data.additionalNotes || null,
        marketingConsent: data.marketingConsent,
      });

      await sendSupplierRegistrationNotification({
        email: data.email,
        companyName: data.companyName,
        contactName: data.contactName,
        phone: data.phoneNumber,
        productCategories: data.productCategoriesSupply,
      });

      // Send confirmation to the supplier
      await sendSupplierConfirmation({
        email: data.email,
        contactName: data.contactName,
        companyName: data.companyName,
      });
      
      res.status(201).json({ message: "Supplier application submitted successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Supplier registration error:", error);
      res.status(500).json({ message: "Submission failed" });
    }
  });

  // ==================== CONTACT FORM ====================
  app.post("/api/contact", async (req, res) => {
    try {
      const data = contactFormSchema.parse(req.body);
      
      await storage.createContactMessage({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        message: data.message,
        status: "new",
      });

      await sendContactFormNotification({
        name: data.name,
        email: data.email,
        subject: "Contact Form Submission",
        message: data.message,
        phone: data.phone,
      });

      // Send confirmation to the user
      await sendContactFormConfirmation({
        email: data.email,
        name: data.name,
        subject: "Contact Form Submission",
      });
      
      res.status(201).json({ message: "Message sent successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Contact form error:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // ==================== QUOTE ROUTES (CUSTOMER) ====================
  app.post("/api/quotes", requireActiveCustomer, async (req: any, res) => {
    try {
      const { items, customerNotes } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Quote must have at least one item" });
      }

      let totalEstimate = 0;
      const validItems = [];

      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (!product || !product.isActive) {
          return res.status(400).json({ message: `Invalid product: ${item.productId}` });
        }
        
        const quantity = Math.max(1, Number(item.quantity) || 1);
        const lineTotal = Number(product.wholesalePrice) * quantity;
        totalEstimate += lineTotal;
        
        validItems.push({
          productId: product.id,
          quantity,
          unitPrice: product.wholesalePrice,
          lineTotal: lineTotal.toFixed(2),
        });
      }

      const quote = await storage.createQuote({
        userId: req.user.id,
        status: "pending",
        customerNotes: customerNotes || null,
        totalEstimate: totalEstimate.toFixed(2),
      });

      for (const item of validItems) {
        await storage.createQuoteItem({
          quoteId: quote.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        });
      }

      const totalValueFormatted = `£${Number(totalEstimate).toFixed(2)}`;
      
      await sendQuoteSubmissionNotification({
        quoteId: quote.id,
        customerEmail: req.user.email,
        customerName: req.user.primaryContactName || req.user.companyName,
        companyName: req.user.companyName,
        itemCount: validItems.length,
        totalValue: totalValueFormatted,
      });

      await sendQuoteConfirmationToCustomer({
        email: req.user.email,
        contactName: req.user.primaryContactName || req.user.companyName,
        quoteId: quote.id,
        itemCount: validItems.length,
        totalValue: totalValueFormatted,
      });

      res.status(201).json({ quote, message: "Quote request submitted successfully" });
    } catch (error) {
      console.error("Quote creation error:", error);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  app.get("/api/quotes", requireActiveCustomer, async (req: any, res) => {
    try {
      const quoteList = await storage.getQuotesByUser(req.user.id);
      res.json(quoteList);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.get("/api/quotes/:id", requireActiveCustomer, async (req: any, res) => {
    try {
      const quote = await storage.getQuoteWithItems(Number(req.params.id));
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      if (quote.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(quote);
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  // Customer quote response (accept/decline)
  const customerQuoteResponseSchema = z.object({
    status: z.enum(["accepted", "declined"]),
  });

  app.patch("/api/quotes/:id", requireActiveCustomer, async (req: any, res) => {
    try {
      const quoteId = Number(req.params.id);
      const { status } = customerQuoteResponseSchema.parse(req.body);
      
      const quote = await storage.getQuote(quoteId);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      if (quote.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (quote.status !== "quoted") {
        return res.status(400).json({ 
          message: "Only quotes with 'quoted' status can be accepted or declined" 
        });
      }
      
      if (quote.expiryDate && new Date(quote.expiryDate) < new Date()) {
        return res.status(400).json({ 
          message: "This quote has expired. Please request a new quote." 
        });
      }
      
      const updatedQuote = await storage.updateQuote(quoteId, { status });
      
      res.json(updatedQuote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid status. Must be 'accepted' or 'declined'" });
      }
      console.error("Error updating quote:", error);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  // ==================== CMS & SETTINGS (PUBLIC) ====================
  
  // Get CMS blocks by section (for footer, etc.)
  app.get("/api/cms-blocks/:section", async (req, res) => {
    try {
      const blocks = await storage.getCmsBlocksBySection(req.params.section);
      res.json(blocks);
    } catch (error) {
      console.error("Error fetching CMS blocks:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.get("/api/cms/:key", async (req, res) => {
    try {
      const block = await storage.getCmsBlock(req.params.key);
      if (!block) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.json(block);
    } catch (error) {
      console.error("Error fetching CMS block:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.get("/api/settings/:key", async (req, res) => {
    try {
      const value = await storage.getSetting(req.params.key);
      if (value === undefined) {
        return res.status(404).json({ message: "Setting not found" });
      }
      res.json({ key: req.params.key, value });
    } catch (error) {
      console.error("Error fetching setting:", error);
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  // ==================== BLOG (PUBLIC) ====================
  
  // Get all published blog posts
  app.get("/api/blog", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      const [posts, total] = await Promise.all([
        storage.getAllBlogPosts({ publishedOnly: true, limit, offset }),
        storage.getBlogPostCount(true)
      ]);
      
      res.json({
        posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  // Get single blog post by slug (public)
  app.get("/api/blog/:slug", async (req, res) => {
    try {
      const post = await storage.getBlogPostBySlug(req.params.slug);
      if (!post || post.status !== "published") {
        return res.status(404).json({ message: "Blog post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });

  // ==================== PUBLIC OFFER ROUTES ====================
  app.get("/api/offers", async (req, res) => {
    try {
      const activeOffers = await storage.getActiveOffers();
      res.json(activeOffers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      res.status(500).json({ message: "Failed to fetch offers" });
    }
  });

  app.get("/api/offers/:idOrSlug", async (req, res) => {
    try {
      const param = req.params.idOrSlug;
      let offer;
      const id = Number(param);
      if (!isNaN(id) && id > 0) {
        offer = await storage.getOffer(id);
      }
      if (!offer) {
        offer = await storage.getOfferBySlug(param);
      }
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }
      res.json(offer);
    } catch (error) {
      console.error("Error fetching offer:", error);
      res.status(500).json({ message: "Failed to fetch offer" });
    }
  });

  app.get("/api/offers/:idOrSlug/items", async (req, res) => {
    try {
      const param = req.params.idOrSlug;
      let offer;
      const id = Number(param);
      if (!isNaN(id) && id > 0) {
        offer = await storage.getOffer(id);
      }
      if (!offer) {
        offer = await storage.getOfferBySlug(param);
      }
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }
      const items = await storage.getOfferItems(offer.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching offer items:", error);
      res.status(500).json({ message: "Failed to fetch offer items" });
    }
  });

  // ==================== ADMIN ROUTES ====================
  
  // Admin - Users
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const userList = await storage.getAllUsers();
      res.json(userList.map(u => publicUser(u)));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const { status, role } = req.body;
      const updates: any = {};
      if (status) updates.status = status;
      if (role) updates.role = role;

      const user = await storage.updateUser(Number(req.params.id), updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (status === "active") {
        await sendAccountApprovalEmail({
          email: user.email,
          contactName: user.primaryContactName || user.companyName || "Customer",
          companyName: user.companyName || "Your Company",
        });
      } else if (status === "rejected") {
        await sendAccountRejectionEmail({
          email: user.email,
          contactName: user.primaryContactName || user.companyName || "Customer",
          companyName: user.companyName || "Your Company",
        });
      }

      res.json(publicUser(user));
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // ==================== ADMIN - STAFF MANAGEMENT ====================
  
  const createStaffSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    primaryContactName: z.string().min(1),
  });

  // Get all staff members
  app.get("/api/admin/staff", requireAdmin, async (req, res) => {
    try {
      const userList = await storage.getAllUsers();
      const staffList = userList.filter(u => u.role === "staff" || u.role === "admin");
      res.json(staffList.map(u => publicUser(u)));
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  // Create new staff member
  app.post("/api/admin/staff", requireAdmin, async (req, res) => {
    try {
      const data = createStaffSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const passwordHash = await bcrypt.hash(data.password, 10);
      
      const user = await storage.createUser({
        email: data.email.toLowerCase(),
        passwordHash,
        role: "staff",
        status: "active",
        primaryContactName: data.primaryContactName,
      });

      const { passwordHash: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating staff:", error);
      res.status(500).json({ message: "Failed to create staff member" });
    }
  });

  // Invite an admin or staff member by email — they set their own password (no password typed by the owner).
  const inviteSchema = z.object({
    email: z.string().email(),
    primaryContactName: z.string().min(1),
    role: z.enum(["admin", "staff"]),
  });
  app.post("/api/admin/team/invite", requireAdmin, async (req, res) => {
    try {
      const data = inviteSchema.parse(req.body);
      const email = data.email.toLowerCase().trim();
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const crypto = await import("node:crypto");
      // Random placeholder password (never used — they set their own via the invite link).
      const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 12);
      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const user = await storage.createUser({
        email,
        passwordHash,
        role: data.role,
        status: "active",
        primaryContactName: data.primaryContactName,
        passwordResetToken: token,
        passwordResetExpiry: expiry,
      } as any);

      const SITE_URL = process.env.SITE_URL || "https://pharmaoasis.co.uk";
      const inviteUrl = `${SITE_URL}/reset-password?token=${token}`;
      const { sendInviteEmail } = await import("./email");
      const emailResult = await sendInviteEmail({
        email,
        contactName: data.primaryContactName,
        roleLabel: data.role === "admin" ? "Administrator" : "Staff member",
        inviteUrl,
      });

      const { passwordHash: _, ...safeUser } = user;
      res.status(201).json({ ...safeUser, inviteSent: emailResult.success });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error inviting team member:", error);
      res.status(500).json({ message: "Failed to send invite" });
    }
  });

  // Update staff member (role, status)
  app.patch("/api/admin/staff/:id", requireAdmin, async (req: any, res) => {
    try {
      const targetId = Number(req.params.id);
      const { status, role } = req.body;
      
      // Prevent admin from demoting themselves
      if (req.user.id === targetId && role && role !== "admin") {
        return res.status(400).json({ message: "You cannot demote yourself" });
      }
      
      const updates: any = {};
      if (status) updates.status = status;
      if (role) updates.role = role;

      const user = await storage.updateUser(targetId, updates);
      if (!user) {
        return res.status(404).json({ message: "Staff member not found" });
      }

      res.json(publicUser(user));
    } catch (error) {
      console.error("Error updating staff:", error);
      res.status(500).json({ message: "Failed to update staff member" });
    }
  });

  // Delete staff member (soft delete by setting status to suspended)
  app.delete("/api/admin/staff/:id", requireAdmin, async (req: any, res) => {
    try {
      const targetId = Number(req.params.id);
      
      // Prevent admin from deleting themselves
      if (req.user.id === targetId) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }
      
      const user = await storage.getUser(targetId);
      if (!user) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      
      // Soft delete by setting status to suspended
      await storage.updateUser(targetId, { status: "suspended", role: "customer" });
      res.json({ message: "Staff member removed" });
    } catch (error) {
      console.error("Error deleting staff:", error);
      res.status(500).json({ message: "Failed to delete staff member" });
    }
  });

  // ============================================
  // ANALYTICS ENDPOINTS
  // ============================================
  
  // Track page view (public endpoint)
  app.post("/api/analytics/pageview", async (req: any, res) => {
    try {
      const { pagePath, pageTitle, sessionId, referrer } = req.body;
      
      if (!pagePath) {
        return res.status(400).json({ message: "pagePath is required" });
      }
      
      const userAgent = req.headers["user-agent"] || "";
      const ipAddress = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip || "";
      
      // Simple device type detection
      let deviceType = "desktop";
      if (/mobile/i.test(userAgent)) deviceType = "mobile";
      else if (/tablet|ipad/i.test(userAgent)) deviceType = "tablet";
      
      // Simple browser detection
      let browser = "Unknown";
      if (/chrome/i.test(userAgent) && !/edge|edg/i.test(userAgent)) browser = "Chrome";
      else if (/firefox/i.test(userAgent)) browser = "Firefox";
      else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = "Safari";
      else if (/edge|edg/i.test(userAgent)) browser = "Edge";
      
      await storage.createPageView({
        pagePath,
        pageTitle: pageTitle || null,
        sessionId: sessionId || null,
        userId: req.user?.id || null,
        referrer: referrer || null,
        userAgent,
        ipAddress,
        deviceType,
        browser,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking page view:", error);
      res.status(500).json({ message: "Failed to track page view" });
    }
  });
  
  // Get analytics data (admin only)
  app.get("/api/admin/analytics", requireAdmin, async (req, res) => {
    try {
      const { period = "7d" } = req.query;
      
      let daysAgo = 7;
      if (period === "30d") daysAgo = 30;
      else if (period === "90d") daysAgo = 90;
      else if (period === "today") daysAgo = 0;
      
      const analytics = await storage.getAnalytics(daysAgo);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Admin - Products (staff and admin can access)
  app.post("/api/admin/products", requireStaffOrAdmin, async (req, res) => {
    try {
      const body = { ...req.body };
      const numericFields = ['rrp', 'wholesalePrice', 'vatRate', 'googleFeedPrice'] as const;
      for (const field of numericFields) {
        if (body[field] === '' || body[field] === undefined) {
          body[field] = null;
        }
      }
      const intFields = ['moq', 'brandId', 'categoryId', 'subcategoryId'] as const;
      for (const field of intFields) {
        if (body[field] === '' || body[field] === undefined) {
          body[field] = null;
        }
      }
      const data = insertProductSchema.parse(body);
      const product = await storage.createProduct(data);
      res.status(201).json(product);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      if (error?.code === "23505" || error?.constraint) {
        const detail = error.detail || "";
        if (detail.includes("sku")) {
          return res.status(409).json({ message: `A product with SKU "${req.body.sku}" already exists. Please use a unique SKU.` });
        }
        if (detail.includes("ean")) {
          return res.status(409).json({ message: `A product with EAN "${req.body.ean}" already exists. Please use a unique EAN.` });
        }
        if (detail.includes("slug")) {
          return res.status(409).json({ message: `A product with this URL slug already exists. Please change the product name or slug.` });
        }
        return res.status(409).json({ message: "A product with these details already exists. Please check the SKU and EAN are unique." });
      }
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch("/api/admin/products/:id", requireStaffOrAdmin, async (req, res) => {
    try {
      console.log(`[PRODUCT UPDATE] ID: ${req.params.id}, Body:`, JSON.stringify(req.body, null, 2));
      
      // Sanitize data: convert empty strings to null for decimal/numeric fields
      const sanitizedData = { ...req.body };
      const decimalFields = ['wholesalePrice', 'rrp', 'vatRate', 'weight', 'length', 'width', 'height', 'googleFeedPrice'];
      const integerFields = ['moq', 'stockLevel', 'brandId', 'categoryId', 'subcategoryId'];
      
      for (const field of decimalFields) {
        if (sanitizedData[field] === '' || sanitizedData[field] === undefined) {
          sanitizedData[field] = null;
        }
      }
      
      for (const field of integerFields) {
        if (sanitizedData[field] === '' || sanitizedData[field] === undefined) {
          sanitizedData[field] = null;
        } else if (sanitizedData[field] !== null && typeof sanitizedData[field] === 'string') {
          const parsed = parseInt(sanitizedData[field], 10);
          sanitizedData[field] = isNaN(parsed) ? null : parsed;
        }
      }
      
      console.log(`[PRODUCT UPDATE] Sanitized data:`, JSON.stringify(sanitizedData, null, 2));
      
      const product = await storage.updateProduct(Number(req.params.id), sanitizedData);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      if (error?.code === "23505" || error?.constraint) {
        const detail = error.detail || "";
        if (detail.includes("sku")) {
          return res.status(409).json({ message: `A product with SKU "${req.body.sku}" already exists. Please use a unique SKU.` });
        }
        if (detail.includes("ean")) {
          return res.status(409).json({ message: `A product with EAN "${req.body.ean}" already exists. Please use a unique EAN.` });
        }
        if (detail.includes("slug")) {
          return res.status(409).json({ message: `A product with this URL slug already exists. Please change the product name or slug.` });
        }
        return res.status(409).json({ message: "A product with these details already exists. Please check the SKU and EAN are unique." });
      }
      console.error("Error updating product:", error?.message || error);
      res.status(500).json({ message: "Failed to update product", error: error?.message });
    }
  });

  app.delete("/api/admin/products/:id", requireStaffOrAdmin, async (req, res) => {
    try {
      await storage.deleteProduct(Number(req.params.id));
      res.json({ message: "Product deleted" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Admin - SEO update endpoints
  app.patch("/api/admin/products/:id/seo", requireStaffOrAdmin, async (req, res) => {
    try {
      const { slug, metaTitle, metaDescription } = req.body;
      const product = await storage.updateProduct(Number(req.params.id), {
        slug: slug || null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
      });
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error updating product SEO:", error);
      res.status(500).json({ message: "Failed to update product SEO" });
    }
  });

  app.patch("/api/admin/brands/:id/seo", requireStaffOrAdmin, async (req, res) => {
    try {
      const { slug, metaTitle, metaDescription } = req.body;
      const brand = await storage.updateBrand(Number(req.params.id), {
        slug: slug || null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
      });
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      res.json(brand);
    } catch (error) {
      console.error("Error updating brand SEO:", error);
      res.status(500).json({ message: "Failed to update brand SEO" });
    }
  });

  app.patch("/api/admin/categories/:id/seo", requireStaffOrAdmin, async (req, res) => {
    try {
      const { slug, metaTitle, metaDescription } = req.body;
      const category = await storage.updateCategory(Number(req.params.id), {
        slug: slug || null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
      });
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error updating category SEO:", error);
      res.status(500).json({ message: "Failed to update category SEO" });
    }
  });

  // Admin - CSV Import (staff and admin can access)
  app.post("/api/admin/products/import", requireStaffOrAdmin, async (req, res) => {
    try {
      const { products: productData } = req.body;
      
      if (!Array.isArray(productData) || productData.length === 0) {
        return res.status(400).json({ message: "No products to import" });
      }

      const results = { 
        created: 0, 
        updated: 0, 
        failed: 0,
        total: productData.length,
        errors: [] as string[],
        failedRows: [] as { rowNumber: number; data: any; error: string }[]
      };

      for (let i = 0; i < productData.length; i++) {
        const row = productData[i];
        const rowNumber = i + 2; // +2 because row 1 is headers, and we're 0-indexed
        
        try {
          // Validate required fields
          if (!row.sku || !row.productName || !row.brand || !row.category) {
            throw new Error("Missing required fields (sku, productName, brand, or category)");
          }

          // Find or create brand
          let brand = await storage.getBrandByName(row.brand);
          if (!brand) {
            brand = await storage.createBrand({ name: row.brand, isActive: true });
          }

          // Find or create category
          let category = await storage.getCategoryByName(row.category, null);
          if (!category) {
            category = await storage.createCategory({ name: row.category, isActive: true });
          }

          // Find or create subcategory if provided
          let subcategory = null;
          if (row.subcategory) {
            subcategory = await storage.getCategoryByName(row.subcategory, category.id);
            if (!subcategory) {
              subcategory = await storage.createCategory({ 
                name: row.subcategory, 
                parentId: category.id,
                isActive: true 
              });
            }
          }

          // Check if product exists
          const existingProduct = await storage.getProductBySku(row.sku);
          
          const productPayload = {
            sku: row.sku,
            ean: row.ean || null,
            brandId: brand.id,
            productName: row.productName,
            shortDescription: row.shortDescription || null,
            longDescription: row.longDescription || null,
            categoryId: category.id,
            subcategoryId: subcategory?.id || null,
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
          };

          if (existingProduct) {
            await storage.updateProduct(existingProduct.id, productPayload);
            results.updated++;
          } else {
            await storage.createProduct(productPayload);
            results.created++;
          }
        } catch (err: any) {
          results.failed++;
          const errorMessage = err.message || "Unknown error";
          results.errors.push(`Row ${rowNumber} (${row.sku || 'no SKU'}): ${errorMessage}`);
          results.failedRows.push({
            rowNumber,
            data: row,
            error: errorMessage
          });
        }
      }

      res.json(results);
    } catch (error) {
      console.error("CSV import error:", error);
      res.status(500).json({ message: "Import failed" });
    }
  });

  // ==================== BACKGROUND IMPORT API ====================
  
  // Create a new background import job
  app.post("/api/admin/import-jobs", requireStaffOrAdmin, async (req, res) => {
    try {
      const { products: productData, filename } = req.body;
      
      if (!Array.isArray(productData) || productData.length === 0) {
        return res.status(400).json({ message: "No products to import" });
      }
      
      const userId = req.session.userId!;
      const jobId = await createImportJob(userId, filename || "import.csv", productData);
      
      res.json({ 
        message: "Import job created", 
        jobId,
        totalRows: productData.length 
      });
    } catch (error) {
      console.error("Failed to create import job:", error);
      res.status(500).json({ message: "Failed to create import job" });
    }
  });
  
  // Get all import jobs (history)
  app.get("/api/admin/import-jobs", requireStaffOrAdmin, async (req, res) => {
    try {
      const jobs = await getImportJobs(undefined, 50);
      res.json(jobs);
    } catch (error) {
      console.error("Failed to fetch import jobs:", error);
      res.status(500).json({ message: "Failed to fetch import jobs" });
    }
  });
  
  // Get a specific import job
  app.get("/api/admin/import-jobs/:id", requireStaffOrAdmin, async (req, res) => {
    try {
      const job = await getImportJob(parseInt(req.params.id, 10));
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Failed to fetch import job:", error);
      res.status(500).json({ message: "Failed to fetch import job" });
    }
  });
  
  // Get error lines for a job
  app.get("/api/admin/import-jobs/:id/errors", requireStaffOrAdmin, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id, 10);
      const errors = await getImportJobErrors(jobId);
      res.json(errors);
    } catch (error) {
      console.error("Failed to fetch import errors:", error);
      res.status(500).json({ message: "Failed to fetch import errors" });
    }
  });
  
  // Download error lines as CSV
  app.get("/api/admin/import-jobs/:id/errors.csv", requireStaffOrAdmin, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id, 10);
      const job = await getImportJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      const errors = await getImportJobErrors(jobId);
      
      if (errors.length === 0) {
        return res.status(404).json({ message: "No errors found for this job" });
      }
      
      // Build CSV from error lines
      let csv = "rowNumber,sku,productName,brand,category,error\n";
      for (const err of errors) {
        try {
          const data = JSON.parse(err.payload);
          csv += `${err.rowNumber},"${(data.sku || "").replace(/"/g, '""')}","${(data.productName || "").replace(/"/g, '""')}","${(data.brand || "").replace(/"/g, '""')}","${(data.category || "").replace(/"/g, '""')}","${(err.errorMessage || "").replace(/"/g, '""')}"\n`;
        } catch {
          csv += `${err.rowNumber},,,,,"${(err.errorMessage || "").replace(/"/g, '""')}"\n`;
        }
      }
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="import_job_${jobId}_errors.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Failed to download error CSV:", error);
      res.status(500).json({ message: "Failed to download error CSV" });
    }
  });
  
  // Retry failed lines for a job
  app.post("/api/admin/import-jobs/:id/retry", requireStaffOrAdmin, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id, 10);
      const job = await getImportJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      if (job.status !== "completed" && job.status !== "failed") {
        return res.status(400).json({ message: "Job must be completed or failed to retry" });
      }
      
      const retriedCount = await retryImportJobErrors(jobId);
      res.json({ message: `Retrying ${retriedCount} failed rows`, retriedCount });
    } catch (error) {
      console.error("Failed to retry import job:", error);
      res.status(500).json({ message: "Failed to retry import job" });
    }
  });

  // Admin - Brands (staff and admin can access)
  app.get("/api/admin/brands", requireStaffOrAdmin, async (req, res) => {
    try {
      const brandList = await storage.getAllBrands();
      res.json(brandList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch brands" });
    }
  });

  app.post("/api/admin/brands", requireStaffOrAdmin, async (req, res) => {
    try {
      const brand = await storage.createBrand(req.body);
      res.status(201).json(brand);
    } catch (error) {
      res.status(500).json({ message: "Failed to create brand" });
    }
  });

  app.patch("/api/admin/brands/:id", requireStaffOrAdmin, async (req, res) => {
    try {
      const brand = await storage.updateBrand(Number(req.params.id), req.body);
      res.json(brand);
    } catch (error) {
      res.status(500).json({ message: "Failed to update brand" });
    }
  });

  app.delete("/api/admin/brands/:id", requireStaffOrAdmin, async (req, res) => {
    try {
      await storage.deleteBrand(Number(req.params.id));
      res.json({ message: "Brand deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete brand" });
    }
  });

  // AI Description Generation for Brands
  app.post("/api/admin/ai/generate-brand-description", requireStaffOrAdmin, async (req, res) => {
    try {
      const { brandName } = req.body;
      if (!brandName) {
        return res.status(400).json({ message: "Brand name is required" });
      }

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a copywriter for a B2B pharmaceutical wholesaler. Write ONE short sentence (15-20 words max) describing the brand. Be direct and factual. No marketing fluff."
          },
          {
            role: "user",
            content: `Write ONE short sentence about "${brandName}" for a wholesale catalogue.`
          }
        ],
        max_tokens: 50,
        temperature: 0.7,
      });

      const description = response.choices[0]?.message?.content?.trim() || "";
      res.json({ description });
    } catch (error) {
      console.error("AI description generation error:", error);
      res.status(500).json({ message: "Failed to generate description" });
    }
  });

  // AI Product Description Generation
  app.post("/api/admin/ai/generate-product-description", requireStaffOrAdmin, async (req, res) => {
    try {
      const { productName, ean, brand, category, packSize } = req.body;
      if (!productName) {
        return res.status(400).json({ message: "Product name is required" });
      }

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      let prompt = `Product: "${productName}"`;
      if (ean) prompt += `\nEAN: ${ean}`;
      if (brand) prompt += `\nBrand: ${brand}`;
      if (category) prompt += `\nCategory: ${category}`;
      if (packSize) prompt += `\nPack Size: ${packSize}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a product copywriter for a B2B pharmaceutical wholesaler. Write a SHORT product description (maximum 2 lines, under 30 words). Be factual and concise. Focus on key benefits or uses. No marketing fluff or promotional language."
          },
          {
            role: "user",
            content: `Write a short 2-line product description for:\n${prompt}`
          }
        ],
        max_tokens: 60,
        temperature: 0.7,
      });

      const description = response.choices[0]?.message?.content?.trim() || "";
      res.json({ description });
    } catch (error) {
      console.error("AI product description generation error:", error);
      res.status(500).json({ message: "Failed to generate description" });
    }
  });

  // SEO Background Processor - Manual trigger
  app.post("/api/admin/seo/process-batch", requireAdmin, async (req, res) => {
    try {
      const { processSeoBackgroundBatch } = await import("./seo-processor");
      const result = await processSeoBackgroundBatch();
      res.json({
        message: `Processed ${result.processed} products. ${result.remaining} remaining.`,
        ...result,
      });
    } catch (error) {
      console.error("SEO batch processing error:", error);
      res.status(500).json({ message: "Failed to process SEO batch" });
    }
  });

  // Google Feed Price Processor - Manual trigger
  app.post("/api/admin/pricing/process-batch", requireAdmin, async (req, res) => {
    try {
      const { processGooglePriceBatch } = await import("./price-processor");
      const result = await processGooglePriceBatch();
      res.json({
        message: `Processed ${result.processed} products. ${result.remaining} remaining.`,
        ...result,
      });
    } catch (error) {
      console.error("Price batch processing error:", error);
      res.status(500).json({ message: "Failed to process price batch" });
    }
  });

  // Process ALL Google Feed prices at once
  app.post("/api/admin/pricing/process-all", requireAdmin, async (req, res) => {
    try {
      const { forceRegenerate } = req.body;
      const { processAllGooglePrices } = await import("./price-processor");
      const result = await processAllGooglePrices({ forceRegenerate });
      res.json({
        message: `Processed ${result.totalProcessed} products.`,
        ...result,
      });
    } catch (error) {
      console.error("Price processing error:", error);
      res.status(500).json({ message: "Failed to process prices" });
    }
  });

  // Get Google Feed Price status
  app.get("/api/admin/pricing/status", requireAdmin, async (req, res) => {
    try {
      const { getGooglePriceStatus } = await import("./price-processor");
      const status = await getGooglePriceStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to get pricing status" });
    }
  });

  // Download CSV of products WITHOUT Google Price (for filling in)
  app.get("/api/admin/pricing/download-missing", requireAdmin, async (req, res) => {
    try {
      const { products } = await import("@shared/schema");
      const { isNull, or, eq, sql } = await import("drizzle-orm");
      
      const productsWithoutPrice = await db.query.products.findMany({
        where: or(
          isNull(products.googleFeedPrice),
          eq(sql`CAST(${products.googleFeedPrice} AS TEXT)`, ""),
          eq(sql`CAST(${products.googleFeedPrice} AS TEXT)`, "0")
        ),
        with: {
          brand: true,
          category: true,
        },
        orderBy: (products, { asc }) => [asc(products.sku)],
      });

      let csv = "sku,productName,brand,category,googleFeedPrice\n";
      
      for (const p of productsWithoutPrice) {
        const sku = (p.sku || "").replace(/"/g, '""');
        const name = (p.productName || "").replace(/"/g, '""');
        const brand = (p.brand?.name || "").replace(/"/g, '""');
        const category = (p.category?.name || "").replace(/"/g, '""');
        csv += `"${sku}","${name}","${brand}","${category}",""\n`;
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=products-missing-google-price.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error downloading missing prices CSV:", error);
      res.status(500).json({ message: "Failed to download CSV" });
    }
  });

  // Download ALL products with current Google Price (for reference/update)
  app.get("/api/admin/pricing/download-all", requireAdmin, async (req, res) => {
    try {
      const allProducts = await db.query.products.findMany({
        with: {
          brand: true,
          category: true,
        },
        orderBy: (products, { asc }) => [asc(products.sku)],
      });

      let csv = "sku,productName,brand,category,googleFeedPrice\n";
      
      for (const p of allProducts) {
        const sku = (p.sku || "").replace(/"/g, '""');
        const name = (p.productName || "").replace(/"/g, '""');
        const brand = (p.brand?.name || "").replace(/"/g, '""');
        const category = (p.category?.name || "").replace(/"/g, '""');
        const price = p.googleFeedPrice || "";
        csv += `"${sku}","${name}","${brand}","${category}","${price}"\n`;
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=all-products-google-price.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error downloading all prices CSV:", error);
      res.status(500).json({ message: "Failed to download CSV" });
    }
  });

  // Upload CSV with SKU + Google Price (bulk update)
  app.post("/api/admin/pricing/upload", requireAdmin, async (req, res) => {
    try {
      const { rows } = req.body;
      
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "No data provided" });
      }

      const { products } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      let updated = 0;
      let skipped = 0;
      let notFound = 0;
      const errors: string[] = [];

      for (const row of rows) {
        const sku = row.sku?.toString().trim();
        const priceStr = row.googleFeedPrice?.toString().trim() || row.price?.toString().trim() || row.googlePrice?.toString().trim();
        
        if (!sku) {
          skipped++;
          continue;
        }

        const price = parseFloat(priceStr);
        if (isNaN(price) || price <= 0) {
          skipped++;
          continue;
        }

        try {
          const existingProduct = await db.query.products.findFirst({
            where: eq(products.sku, sku),
          });

          if (existingProduct) {
            await db
              .update(products)
              .set({
                googleFeedPrice: price.toFixed(2),
                updatedAt: new Date(),
              })
              .where(eq(products.sku, sku));
            updated++;
          } else {
            notFound++;
          }
        } catch (err: any) {
          errors.push(`SKU ${sku}: ${err.message}`);
        }
      }

      res.json({
        message: `Updated ${updated} products`,
        updated,
        skipped,
        notFound,
        total: rows.length,
        errors: errors.slice(0, 10),
      });
    } catch (error: any) {
      console.error("Error uploading prices CSV:", error);
      res.status(500).json({ message: "Failed to upload prices", error: error.message });
    }
  });

  // ============================================
  // AI CATEGORY PROCESSOR ROUTES
  // ============================================
  
  // Get AI category agent status and statistics
  app.get("/api/admin/ai-categories/status", requireAdmin, async (req, res) => {
    try {
      const { getAiCategoryStats } = await import("./ai-category-processor");
      const stats = await getAiCategoryStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting AI category stats:", error);
      res.status(500).json({ message: "Failed to get AI category stats" });
    }
  });

  // Start the AI category background processor
  app.post("/api/admin/ai-categories/start", requireAdmin, async (req, res) => {
    try {
      const { startAiCategoryProcessor } = await import("./ai-category-processor");
      const intervalMinutes = req.body.intervalMinutes || 30;
      startAiCategoryProcessor(intervalMinutes);
      res.json({ message: `AI category processor started (every ${intervalMinutes} minutes)` });
    } catch (error) {
      console.error("Error starting AI category processor:", error);
      res.status(500).json({ message: "Failed to start AI category processor" });
    }
  });

  // Stop the AI category background processor
  app.post("/api/admin/ai-categories/stop", requireAdmin, async (req, res) => {
    try {
      const { stopAiCategoryProcessor } = await import("./ai-category-processor");
      stopAiCategoryProcessor();
      res.json({ message: "AI category processor stopped" });
    } catch (error) {
      console.error("Error stopping AI category processor:", error);
      res.status(500).json({ message: "Failed to stop AI category processor" });
    }
  });

  // Run a single batch manually
  app.post("/api/admin/ai-categories/run-batch", requireAdmin, async (req, res) => {
    try {
      const { runCategoryBatchManually } = await import("./ai-category-processor");
      const result = await runCategoryBatchManually();
      res.json({
        message: `Processed ${result.processed} products, made ${result.changes} changes. ${result.remaining} remaining.`,
        ...result,
      });
    } catch (error) {
      console.error("Error running AI category batch:", error);
      res.status(500).json({ message: "Failed to run AI category batch" });
    }
  });

  // Get SEO status (how many products need SEO)
  app.get("/api/admin/seo/status", requireAdmin, async (req, res) => {
    try {
      const allProducts = await db.query.products.findMany({
        columns: { id: true, slug: true, metaTitle: true, metaDescription: true },
      });

      const total = allProducts.length;
      const withSeo = allProducts.filter(p => p.slug && p.metaTitle && p.metaDescription).length;
      const needingSeo = total - withSeo;

      res.json({
        total,
        withSeo,
        needingSeo,
        percentComplete: total > 0 ? Math.round((withSeo / total) * 100) : 0,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get SEO status" });
    }
  });

  // SEO AI Agent endpoints
  app.get("/api/admin/seo-agent/status", requireAdmin, async (req, res) => {
    try {
      const { getSeoAgentStatus } = await import("./seo-ai-agent");
      const status = await getSeoAgentStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting SEO agent status:", error);
      res.status(500).json({ message: "Failed to get SEO agent status" });
    }
  });

  app.post("/api/admin/seo-agent/start", requireAdmin, async (req, res) => {
    try {
      const { startSeoAgent } = await import("./seo-ai-agent");
      await startSeoAgent();
      res.json({ message: "SEO Agent started - will run daily optimization" });
    } catch (error) {
      console.error("Error starting SEO agent:", error);
      res.status(500).json({ message: "Failed to start SEO agent" });
    }
  });

  app.post("/api/admin/seo-agent/stop", requireAdmin, async (req, res) => {
    try {
      const { stopSeoAgent } = await import("./seo-ai-agent");
      await stopSeoAgent();
      res.json({ message: "SEO Agent stopped" });
    } catch (error) {
      console.error("Error stopping SEO agent:", error);
      res.status(500).json({ message: "Failed to stop SEO agent" });
    }
  });

  app.post("/api/admin/seo-agent/run-now", requireAdmin, async (req, res) => {
    try {
      const { runManualOptimization } = await import("./seo-ai-agent");
      const result = await runManualOptimization();
      res.json(result);
    } catch (error) {
      console.error("Error running SEO optimization:", error);
      res.status(500).json({ message: "Failed to run SEO optimization" });
    }
  });

  app.get("/api/admin/seo-agent/actions", requireAdmin, async (req, res) => {
    try {
      const { getActionHistory } = await import("./seo-ai-agent");
      const limit = Number(req.query.limit) || 100;
      const offset = Number(req.query.offset) || 0;
      const history = await getActionHistory(limit, offset);
      res.json(history);
    } catch (error) {
      console.error("Error getting SEO agent actions:", error);
      res.status(500).json({ message: "Failed to get SEO agent actions" });
    }
  });

  // ==================== PRODUCT ROTATION MANAGEMENT ====================
  app.get("/api/admin/product-rotation/status", requireAdmin, async (req, res) => {
    try {
      const rotation = await storage.getTodayFeaturedRotation();
      const directBrandIds = await storage.getDirectDistributorBrandIds();
      res.json({
        hasRotation: !!rotation,
        rotationDate: rotation?.rotationDate || null,
        productCount: rotation ? JSON.parse(rotation.productIds as string).length : 0,
        directDistributorBrandCount: directBrandIds.length,
        criteria: rotation?.selectionCriteria ? JSON.parse(rotation.selectionCriteria as string) : null,
      });
    } catch (error) {
      console.error("Error getting rotation status:", error);
      res.status(500).json({ message: "Failed to get rotation status" });
    }
  });

  app.post("/api/admin/product-rotation/generate", requireAdmin, async (req, res) => {
    try {
      await storage.generateDailyRotation();
      const rotation = await storage.getTodayFeaturedRotation();
      res.json({
        success: true,
        rotationDate: rotation?.rotationDate,
        productCount: rotation ? JSON.parse(rotation.productIds as string).length : 0,
        criteria: rotation?.selectionCriteria ? JSON.parse(rotation.selectionCriteria as string) : null,
      });
    } catch (error) {
      console.error("Error generating rotation:", error);
      res.status(500).json({ message: "Failed to generate rotation" });
    }
  });

  // Admin - Categories (staff and admin can access)
  app.get("/api/admin/categories", requireStaffOrAdmin, async (req, res) => {
    try {
      const categoryList = await storage.getAllCategories();
      res.json(categoryList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/admin/categories", requireStaffOrAdmin, async (req, res) => {
    try {
      const category = await storage.createCategory(req.body);
      res.status(201).json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.patch("/api/admin/categories/:id", requireStaffOrAdmin, async (req, res) => {
    try {
      const category = await storage.updateCategory(Number(req.params.id), req.body);
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/admin/categories/:id", requireStaffOrAdmin, async (req, res) => {
    try {
      await storage.deleteCategory(Number(req.params.id));
      res.json({ message: "Category deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Admin - Quotes
  app.get("/api/admin/quotes", requireAdmin, async (req, res) => {
    try {
      const quoteList = await storage.getAllQuotes();
      res.json(quoteList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  // Quote ID param schema for validation
  const quoteIdParamSchema = z.object({
    id: z.coerce.number().int().positive(),
  });

  // Valid status transitions (used by both single and bulk update)
  const validQuoteStatusTransitions: Record<string, string[]> = {
    pending: ["quoted", "declined"],
    quoted: ["accepted", "declined", "closed"],
    accepted: ["closed"],
    declined: ["closed"],
    closed: [],
  };

  // Single quote update schema
  const singleQuoteUpdateSchema = z.object({
    status: z.enum(["pending", "quoted", "accepted", "declined", "closed"]).optional(),
    adminNotes: z.string().max(5000).optional(),
    expiryDate: z.coerce.date().optional().refine(
      date => !date || date > new Date(),
      "Expiry date must be in the future"
    ),
  });

  app.patch("/api/admin/quotes/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = quoteIdParamSchema.parse(req.params);
      const updates = singleQuoteUpdateSchema.parse(req.body);
      
      if (updates.status) {
        const existingQuote = await storage.getQuote(id);
        if (!existingQuote) {
          return res.status(404).json({ message: "Quote not found" });
        }
        
        const allowed = validQuoteStatusTransitions[existingQuote.status] || [];
        if (!allowed.includes(updates.status)) {
          return res.status(400).json({ 
            message: `Invalid status transition from ${existingQuote.status} to ${updates.status}` 
          });
        }
        
        if (updates.status === "quoted" && !updates.expiryDate) {
          return res.status(400).json({ message: "Expiry date is required when setting status to quoted" });
        }
      }
      
      const quote = await storage.updateQuote(id, updates);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  // Get quote version history
  app.get("/api/admin/quotes/:id/versions", requireAdmin, async (req, res) => {
    try {
      const { id } = quoteIdParamSchema.parse(req.params);
      const versions = await storage.getQuoteVersionHistory(id);
      res.json(versions);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid quote ID" });
      }
      console.error("Failed to get version history:", error);
      res.status(500).json({ message: "Failed to fetch version history" });
    }
  });

  // Create new version of a quote
  app.post("/api/admin/quotes/:id/version", requireAdmin, async (req, res) => {
    try {
      const { id } = quoteIdParamSchema.parse(req.params);
      const newVersion = await storage.createQuoteVersion(id);
      res.status(201).json(newVersion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid quote ID" });
      }
      console.error("Failed to create version:", error);
      if (error instanceof Error && error.message === "Quote not found") {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.status(500).json({ message: "Failed to create new version" });
    }
  });

  // Bulk update schema for validation
  const bulkQuoteUpdateSchema = z.object({
    quoteIds: z.array(z.number().int().positive()).min(1, "At least one quote ID required"),
    updates: z.object({
      status: z.enum(["pending", "quoted", "accepted", "declined", "closed"]).optional(),
      adminNotes: z.string().max(5000).optional(),
      expiryDate: z.coerce.date().optional().refine(
        date => !date || date > new Date(),
        "Expiry date must be in the future"
      ),
    }).refine(data => Object.keys(data).length > 0, "At least one update field required"),
  });

  // Bulk update quotes (for bulk approval)
  app.post("/api/admin/quotes/bulk-update", requireAdmin, async (req, res) => {
    try {
      const validatedData = bulkQuoteUpdateSchema.parse(req.body);
      const { quoteIds, updates } = validatedData;
      
      const existingQuotes = await Promise.all(
        quoteIds.map(id => storage.getQuote(id))
      );
      
      const invalidTransitions: number[] = [];
      if (updates.status) {
        for (let i = 0; i < existingQuotes.length; i++) {
          const quote = existingQuotes[i];
          if (quote) {
            const allowed = validQuoteStatusTransitions[quote.status] || [];
            if (!allowed.includes(updates.status)) {
              invalidTransitions.push(quoteIds[i]);
            }
          }
        }
      }
      
      if (invalidTransitions.length > 0) {
        return res.status(400).json({ 
          message: `Invalid status transition for quote(s): ${invalidTransitions.join(", ")}`,
          invalidQuotes: invalidTransitions
        });
      }
      
      if (updates.status === "quoted" && !updates.expiryDate) {
        return res.status(400).json({ message: "Expiry date is required when setting status to quoted" });
      }
      
      const results = await Promise.all(
        quoteIds.map(id => storage.updateQuote(id, updates))
      );
      
      const successCount = results.filter(Boolean).length;
      res.json({ updated: successCount, quotes: results.filter(Boolean) });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Bulk update error:", error);
      res.status(500).json({ message: "Failed to bulk update quotes" });
    }
  });

  // Admin - Supplier Leads
  app.get("/api/admin/supplier-leads", requireAdmin, async (req, res) => {
    try {
      const leads = await storage.getAllSupplierLeads();
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch supplier leads" });
    }
  });

  app.patch("/api/admin/supplier-leads/:id", requireAdmin, async (req, res) => {
    try {
      const lead = await storage.updateSupplierLead(Number(req.params.id), req.body);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.delete("/api/admin/supplier-leads/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteSupplierLead(Number(req.params.id));
      res.json({ message: "Supplier lead deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete supplier lead" });
    }
  });

  // Admin - Blog Posts
  app.get("/api/admin/blog", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      
      const [posts, total] = await Promise.all([
        storage.getAllBlogPosts({ limit, offset }),
        storage.getBlogPostCount()
      ]);
      
      res.json({
        posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  app.get("/api/admin/blog/:id", requireAdmin, async (req, res) => {
    try {
      const post = await storage.getBlogPost(Number(req.params.id));
      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });

  const createBlogPostSchema = insertBlogPostSchema.extend({
    title: z.string().min(1, "Title is required").max(500),
    content: z.string().min(1, "Content is required"),
    status: z.enum(["draft", "published"]).default("draft"),
  });

  app.post("/api/admin/blog", requireAdmin, async (req, res) => {
    try {
      const validationResult = createBlogPostSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: validationResult.error.errors[0]?.message || "Invalid input" 
        });
      }
      
      const { title, slug, excerpt, content, featuredImage, metaTitle, metaDescription, status } = validationResult.data;
      
      // Generate slug from title if not provided
      const finalSlug = slug || title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      // Check for duplicate slug
      const existing = await storage.getBlogPostBySlug(finalSlug);
      if (existing) {
        return res.status(400).json({ message: "A blog post with this URL already exists" });
      }
      
      const post = await storage.createBlogPost({
        title,
        slug: finalSlug,
        excerpt,
        content,
        featuredImage,
        metaTitle: metaTitle || title,
        metaDescription: metaDescription || excerpt,
        status: status || 'draft',
        publishedAt: status === 'published' ? new Date() : null,
        authorId: (req as any).user?.id || null,
      });
      
      res.status(201).json(post);
    } catch (error) {
      console.error("Error creating blog post:", error);
      res.status(500).json({ message: "Failed to create blog post" });
    }
  });

  const updateBlogPostSchema = z.object({
    title: z.string().min(1, "Title is required").max(500).optional(),
    slug: z.string().max(200).optional(),
    excerpt: z.string().max(1000).optional().nullable(),
    content: z.string().min(1, "Content is required").optional(),
    featuredImage: z.string().max(500).optional().nullable(),
    metaTitle: z.string().max(200).optional().nullable(),
    metaDescription: z.string().max(500).optional().nullable(),
    status: z.enum(["draft", "published"]).optional(),
  });

  app.patch("/api/admin/blog/:id", requireAdmin, async (req, res) => {
    try {
      const validationResult = updateBlogPostSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: validationResult.error.errors[0]?.message || "Invalid input" 
        });
      }
      
      const { title, slug, excerpt, content, featuredImage, metaTitle, metaDescription, status } = validationResult.data;
      const id = Number(req.params.id);
      
      const existing = await storage.getBlogPost(id);
      if (!existing) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      
      // If slug is changing, check for duplicates
      if (slug && slug !== existing.slug) {
        const duplicate = await storage.getBlogPostBySlug(slug);
        if (duplicate && duplicate.id !== id) {
          return res.status(400).json({ message: "A blog post with this URL already exists" });
        }
      }
      
      // Set publishedAt when first publishing
      const updates: any = { title, slug, excerpt, content, featuredImage, metaTitle, metaDescription, status };
      if (status === 'published' && existing.status !== 'published') {
        updates.publishedAt = new Date();
      }
      
      const post = await storage.updateBlogPost(id, updates);
      res.json(post);
    } catch (error) {
      console.error("Error updating blog post:", error);
      res.status(500).json({ message: "Failed to update blog post" });
    }
  });

  app.delete("/api/admin/blog/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteBlogPost(Number(req.params.id));
      res.json({ message: "Blog post deleted" });
    } catch (error) {
      console.error("Error deleting blog post:", error);
      res.status(500).json({ message: "Failed to delete blog post" });
    }
  });

  // Internal link configuration for AI blog generation
  const INTERNAL_LINKS = {
    compliance: "/compliance",
    products: "/products",
    brands: "/brands",
    howToOrder: "/how-to-order",
    distributionNetwork: "/distribution-network",
    contact: "/contact",
  };
  const SITE_URL = "https://pharmaoasis.co.uk";
  const COMPLIANCE_KEYWORDS = [
    "gdp", "good distribution practice", "mhra", "wda", "wda(h)", "wholesale dealer", 
    "pharmaceutical regulation", "regulatory compliance", "pharmaceutical licensing", 
    "quality management", "cold chain", "falsified medicines", "fmd", "responsible person", 
    "pharmaceutical distribution", "healthcare distribution", "otc medicines", "otc medicine",
    "over the counter", "over-the-counter", "general sale list", "gsl", "pharmacy medicine",
    "pharmacy medicines", "p medicine", "wholesale distribution", "wholesale distributor",
    "pharmaceutical wholesaler", "medicine distribution", "mhra licensing", "wda licence"
  ];
  
  function shouldIncludeComplianceLink(topic: string): boolean {
    const lowerTopic = topic.toLowerCase();
    return COMPLIANCE_KEYWORDS.some(keyword => lowerTopic.includes(keyword));
  }

  // AI Blog Draft Generator
  const generateBlogDraftSchema = z.object({
    topic: z.string().min(5, "Topic must be at least 5 characters").max(2000),
    keywords: z.string().max(1000).optional(),
  });

  app.post("/api/admin/blog/generate-draft", requireAdmin, async (req, res) => {
    try {
      const validationResult = generateBlogDraftSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: validationResult.error.errors[0]?.message || "Invalid input" 
        });
      }

      const { topic, keywords } = validationResult.data;
      
      // Check if compliance link should be included based on topic
      const includeComplianceLink = shouldIncludeComplianceLink(topic);
      
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Dynamic internal linking instructions based on topic relevance
      const complianceLinkInstruction = includeComplianceLink 
        ? `* ${SITE_URL}${INTERNAL_LINKS.compliance} - REQUIRED for this topic (GDP/compliance). Use anchor text like "GDP Compliance Framework" or "our regulatory compliance standards"`
        : `* ${SITE_URL}${INTERNAL_LINKS.compliance} - for GDP/compliance topics (only if directly relevant)`;

      const systemPrompt = `You are generating professional, compliance-safe blog articles for Pharma Oasis, a UK-based pharmaceutical wholesaler supplying OTC medicines, vitamins, supplements, and medical devices.

STEP 1 — TOPIC CLASSIFICATION (MANDATORY)
Before writing, identify the primary topic of the article as ONE of the following:
- Regulatory / Compliance (MHRA, GDP, WDA(H))
- OTC Medicines
- Vitamins & Supplements
- Medical Devices
- Product or Brand Overview

STEP 2 — SOURCE SELECTION RULES
Based on the topic classification, you MUST prioritise authoritative sources as follows:

A. Regulatory / Compliance Topics:
   REQUIRED sources: GOV.UK, MHRA
   Optional: EMA (if EU-relevant)
   Example links:
   - https://www.gov.uk/guidance/good-distribution-practice-gdp
   - https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency

B. OTC Medicines Topics:
   REQUIRED sources: GOV.UK, NHS, MHRA
   Optional: SmPC or PIL references where appropriate
   Example links:
   - https://www.nhs.uk/medicines/
   - https://www.gov.uk/government/publications/list-of-general-sale-list-medicines

C. Vitamins & Supplements Topics:
   REQUIRED sources: NHS, EFSA (European Food Safety Authority)
   Optional: GOV.UK guidance on food supplements
   Example links:
   - https://www.nhs.uk/conditions/vitamins-and-minerals/
   - https://www.efsa.europa.eu/en/topics/topic/vitamins-minerals-and-other-substances
   AVOID: Influencer blogs or sales websites

D. Medical Devices Topics:
   REQUIRED sources: MHRA medical device guidance, GOV.UK
   Optional: Manufacturer IFU (Instructions for Use) summaries (non-promotional)
   Example links:
   - https://www.gov.uk/government/collections/regulatory-guidance-for-medical-devices
   - https://www.gov.uk/guidance/register-as-a-manufacturer-to-sell-medical-devices

E. Product or Brand Articles:
   REQUIRED: Manufacturer official website ONLY
   Use publicly available product information
   AVOID: Unverified claims, reviews, or affiliate-style content

===== MANDATORY INTERNAL & EXTERNAL LINKING RULES =====
These rules override all other content generation instructions.

RULE 1 — COMPLIANCE LINK (REQUIRED FOR RELEVANT TOPICS)
For any article related to: MHRA, GDP, WDA(H), OTC medicines, pharmaceutical regulation, or healthcare distribution:
- You MUST include EXACTLY ONE internal compliance link
- URL: /compliance (relative) or ${SITE_URL}/compliance (absolute)
- Anchor text MUST be descriptive, examples:
  * "GDP Compliance Framework"
  * "MHRA & GDP Compliance Standards"
  * "Regulatory Compliance Overview"
- Do NOT include more than one compliance link per article
- Internal links do NOT use target="_blank" (stay in same tab)
${includeComplianceLink ? '- THIS TOPIC REQUIRES a compliance link' : '- This topic does NOT require a compliance link (non-regulatory content)'}

RULE 2 — PRODUCT/COMMERCIAL LINKS (OPTIONAL & RESTRICTED)
Links to commercial pages (e.g. /products, /brands, /catalogue) are OPTIONAL.
These links may ONLY be included if they:
- Appear naturally in the CONCLUSION section only
- Are NOT promotional in tone
- Are LIMITED to ONE per article maximum
Do NOT include product links in regulatory or educational sections.

RULE 3 — EXTERNAL LINKS (CONTROLLED)
External links may ONLY be added if they:
- Are authoritative (GOV.UK, MHRA, NHS, EFSA, official manufacturer)
- Add regulatory or factual value
External links MUST have: target="_blank" rel="noopener noreferrer"
Example: <a href="https://www.gov.uk/guidance/gdp" target="_blank" rel="noopener noreferrer">GDP guidance</a>
Include 2-4 external links per article based on topic relevance.

RULE 4 — LINK HYGIENE (MANDATORY)
- Never insert broken or speculative links
- Never repeat the same link multiple times
- Do not cluster links together in one paragraph
- Do not use "click here" as anchor text
- Spread links naturally throughout the article

RULE 5 — FALLBACK BEHAVIOUR
If the /compliance page does not exist:
- OMIT the internal compliance link entirely
- Do NOT substitute another internal link

===== END LINKING RULES =====

STEP 5 — CONTENT STYLE & SAFETY
- Professional, neutral, B2B tone
- Suitable for MHRA-regulated audiences
- No medical advice
- No exaggerated health claims
- No marketing hype
- Educational and factual only

STEP 6 — HTML OUTPUT RULES
- Output must be valid HTML only
- Use semantic HTML: <h2>, <h3>, <p>, <ul>, <li>
- Do NOT nest <p> tags inside other <p> tags
- Do NOT duplicate paragraphs
- No Markdown
- No inline CSS unless part of the disclaimer

STEP 7 — CONTENT STRUCTURE
- 800-1200 words
- Start with an engaging introduction
- Use <h2> for main sections, <h3> for subsections
- Include bullet points where appropriate

OUTPUT FORMAT (JSON):
{
  "title": "Blog title (60-70 characters, engaging, SEO-friendly)",
  "slug": "url-friendly-slug-format",
  "metaTitle": "SEO meta title (50-60 characters)",
  "metaDescription": "SEO meta description (150-160 characters)",
  "excerpt": "Brief summary for listing pages (150-200 characters)",
  "content": "Full article in HTML format with embedded internal and external links",
  "topicClassification": "One of: Regulatory/Compliance, OTC Medicines, Vitamins & Supplements, Medical Devices, Product/Brand",
  "suggestedLinks": ["Array of internal link paths used"],
  "hasComplianceLink": true/false,
  "externalLinksUsed": ["Array of external URLs used"]
}

STEP 8 — DISCLAIMER (MANDATORY)
End every article with this disclaimer:
<div style="background-color: #f8f9fa; border-left: 4px solid #0066cc; padding: 16px; margin-top: 24px;">
<p style="margin: 0; font-size: 14px; color: #666;"><strong>Disclaimer:</strong> This article is for informational purposes only and does not constitute medical advice. All pharmaceutical products distributed by Pharma Oasis are supplied in accordance with MHRA WDA(H) licensing requirements and GDP compliance standards. For product-specific information, please consult the relevant Summary of Product Characteristics (SmPC) or speak with a qualified healthcare professional.</p>
</div>`;

      const userPrompt = `Write a blog article about: ${topic}${keywords ? `\n\nIncorporate these keywords where natural: ${keywords}` : ''}

REQUIREMENTS:
- First classify this topic into one of: Regulatory/Compliance, OTC Medicines, Vitamins & Supplements, Medical Devices, Product/Brand
- Target audience: UK pharmacies, online retailers, wholesalers
- 800-1200 words with proper HTML structure
- End with the compliance disclaimer

MANDATORY LINKING REQUIREMENTS:
${includeComplianceLink ? '- MUST include exactly ONE compliance link (/compliance) with descriptive anchor text like "GDP Compliance Framework"' : '- No compliance link needed (non-regulatory topic)'}
- External links (2-4): Only authoritative sources (GOV.UK, MHRA, NHS, EFSA), all must have target="_blank" rel="noopener noreferrer"
- Product/commercial links: OPTIONAL, maximum ONE, only in conclusion, non-promotional
- Internal links do NOT use target="_blank"
- Never repeat the same link, never cluster links, never use "click here" as anchor text`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 4096,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ message: "AI did not generate content" });
      }

      let generated;
      try {
        generated = JSON.parse(content);
      } catch {
        return res.status(500).json({ message: "Failed to parse AI response" });
      }

      // Generate unique slug
      let slug = generated.slug || generated.title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      const existingSlug = await storage.getBlogPostBySlug(slug);
      if (existingSlug) {
        slug = `${slug}-${Date.now()}`;
      }

      // Create draft blog post
      const post = await storage.createBlogPost({
        title: generated.title,
        slug,
        excerpt: generated.excerpt,
        content: generated.content,
        metaTitle: generated.metaTitle || generated.title,
        metaDescription: generated.metaDescription || generated.excerpt,
        status: 'draft',
        publishedAt: null,
        authorId: (req as any).user?.id || null,
      });

      res.status(201).json({
        post,
        suggestedLinks: generated.suggestedLinks || [],
        message: "Blog draft generated successfully. Please review before publishing."
      });
    } catch (error) {
      console.error("Error generating blog draft:", error);
      res.status(500).json({ message: "Failed to generate blog draft" });
    }
  });

  // AI Review & Correction endpoint
  const reviewBlogDraftSchema = z.object({
    instructions: z.string().min(10, "Instructions must be at least 10 characters").max(2000),
  });

  app.post("/api/admin/blog/:id/review", requireAdmin, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ message: "Invalid post ID" });
      }

      const validationResult = reviewBlogDraftSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: validationResult.error.errors[0]?.message || "Invalid input" 
        });
      }

      const { instructions } = validationResult.data;

      // Get the existing post
      const post = await storage.getBlogPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }

      // Only allow review of draft posts
      if (post.status !== 'draft') {
        return res.status(400).json({ message: "Only draft posts can be reviewed and corrected" });
      }

      // Check if compliance link should be included based on title/content
      const searchText = `${post.title} ${post.excerpt || ''} ${post.content || ''}`.toLowerCase();
      const includeComplianceLink = COMPLIANCE_KEYWORDS.some(keyword => searchText.includes(keyword));

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const systemPrompt = `You are the Pharma Oasis compliance editor. Your role is to review and correct existing blog articles based on specific user instructions.

===== CRITICAL RULES — YOU MUST FOLLOW =====

1. DO NOT REWRITE THE ARTICLE COMPLETELY
   - You are making targeted corrections only
   - Preserve the original structure, flow, and intent
   - Only change what the user specifically requests

2. DO NOT CHANGE THE TOPIC OR INTENT
   - The article topic must remain the same
   - Do not introduce new subjects unless explicitly instructed
   - Keep the same target audience focus

3. ONLY APPLY REQUESTED CORRECTIONS
   - Read the user's correction instructions carefully
   - Apply only the changes they have asked for
   - Do not "improve" sections that weren't mentioned

4. PRESERVE PROFESSIONAL, REGULATORY TONE
   - Maintain B2B pharmaceutical industry language
   - Keep content suitable for MHRA-regulated audiences
   - No casual language or marketing hype

5. MAINTAIN VALID HTML
   - Output must be valid semantic HTML
   - Use <h2>, <h3>, <p>, <ul>, <li> appropriately
   - Do NOT nest <p> tags inside other <p> tags
   - No Markdown in output

6. PREVENT DUPLICATE PARAGRAPHS
   - Check that no paragraph is repeated
   - If duplicate content exists, keep only one instance

7. LINK CORRECTIONS
   - Insert or correct external links where requested
   - External links MUST have: target="_blank" rel="noopener noreferrer"
   - Internal links (to Pharma Oasis pages) do NOT use target="_blank"
   - Compliance link URL: ${SITE_URL}${INTERNAL_LINKS.compliance}
   ${includeComplianceLink 
     ? '- MANDATORY: This article MUST contain exactly ONE compliance link. If missing, ADD it with anchor text like "GDP Compliance Framework" or "MHRA & GDP Compliance Standards". Do NOT add more than one.' 
     : '- This article does NOT require a compliance link (non-regulatory content). Do NOT add one unless explicitly requested.'}

8. REMOVE PROBLEMATIC CONTENT IF FLAGGED
   - Remove commercial or sales-style language if requested
   - Remove medical advice if flagged
   - Remove unverified claims if flagged

===== OUTPUT FORMAT =====
Return a JSON object with ONLY the fields that were changed. Include null for unchanged fields:

{
  "title": "Updated title or null if unchanged",
  "excerpt": "Updated excerpt or null if unchanged",
  "content": "Updated HTML content (always include this even if minimal changes)",
  "metaTitle": "Updated SEO title or null if unchanged",
  "metaDescription": "Updated SEO description or null if unchanged",
  "changesSummary": "Brief summary of what was changed"
}

IMPORTANT: The "content" field should ALWAYS contain the full updated article HTML, even if only small changes were made.`;

      const userPrompt = `Please review and correct this blog article based on my instructions.

===== CURRENT ARTICLE =====
Title: ${post.title}
Excerpt: ${post.excerpt || 'No excerpt'}

Content:
${post.content}

===== MY CORRECTION INSTRUCTIONS =====
${instructions}

===== TASK =====
Apply ONLY the corrections I have requested above. Do not rewrite the entire article. Preserve the original structure and topic. Return the updated article in JSON format.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 4096,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ message: "AI did not generate a response" });
      }

      let corrected;
      try {
        corrected = JSON.parse(content);
      } catch {
        return res.status(500).json({ message: "Failed to parse AI response" });
      }

      // Build validated update data - only allow specific fields to be updated
      const updateData: {
        title?: string;
        excerpt?: string;
        content?: string;
        metaTitle?: string;
        metaDescription?: string;
      } = {};
      
      // Validate and sanitize AI response fields
      if (corrected.title && typeof corrected.title === 'string' && corrected.title.trim() !== post.title) {
        updateData.title = corrected.title.trim();
      }
      if (corrected.excerpt && typeof corrected.excerpt === 'string' && corrected.excerpt.trim() !== post.excerpt) {
        updateData.excerpt = corrected.excerpt.trim();
      }
      if (corrected.content && typeof corrected.content === 'string') {
        // Always update content if provided - this is the main correction target
        updateData.content = corrected.content;
      }
      if (corrected.metaTitle && typeof corrected.metaTitle === 'string' && corrected.metaTitle.trim() !== post.metaTitle) {
        updateData.metaTitle = corrected.metaTitle.trim();
      }
      if (corrected.metaDescription && typeof corrected.metaDescription === 'string' && corrected.metaDescription.trim() !== post.metaDescription) {
        updateData.metaDescription = corrected.metaDescription.trim();
      }

      // Only update if there are changes
      if (Object.keys(updateData).length === 0) {
        return res.json({
          post,
          changesSummary: "No changes were needed based on the instructions.",
          message: "Article reviewed - no changes applied."
        });
      }

      const updatedPost = await storage.updateBlogPost(postId, updateData);

      res.json({
        post: updatedPost,
        changesSummary: corrected.changesSummary || "Changes applied successfully.",
        message: "Article corrected successfully. Please review before publishing."
      });
    } catch (error) {
      console.error("Error reviewing blog draft:", error);
      res.status(500).json({ message: "Failed to review blog draft" });
    }
  });

  // Retroactive compliance link insertion for existing blogs
  app.post("/api/admin/blog/insert-compliance-links", requireAdmin, async (req, res) => {
    try {
      const posts = await storage.getAllBlogPosts();
      const COMPLIANCE_URL = `${SITE_URL}${INTERNAL_LINKS.compliance}`;
      
      const results = {
        processed: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        details: [] as { id: number; title: string; status: string; reason?: string }[]
      };

      for (const post of posts) {
        results.processed++;
        
        // Check if post already has compliance link
        if (post.content?.includes(INTERNAL_LINKS.compliance) || post.content?.includes(COMPLIANCE_URL)) {
          results.skipped++;
          results.details.push({ id: post.id, title: post.title, status: 'skipped', reason: 'Already has compliance link' });
          continue;
        }

        // Check if post topic is compliance-related based on title/content
        const searchText = `${post.title} ${post.excerpt || ''} ${post.content || ''}`.toLowerCase();
        const isComplianceRelated = COMPLIANCE_KEYWORDS.some(keyword => searchText.includes(keyword));
        
        if (!isComplianceRelated) {
          results.skipped++;
          results.details.push({ id: post.id, title: post.title, status: 'skipped', reason: 'Not compliance-related' });
          continue;
        }

        try {
          // Find a suitable location to insert the compliance link
          let updatedContent = post.content || '';
          
          // Strategy: Insert after first mention of GDP, MHRA, compliance, etc.
          const insertPatterns = [
            /(<p>[^<]*(?:GDP|Good Distribution Practice)[^<]*<\/p>)/i,
            /(<p>[^<]*(?:MHRA|regulatory compliance)[^<]*<\/p>)/i,
            /(<p>[^<]*(?:pharmaceutical regulation|WDA\(H\))[^<]*<\/p>)/i,
          ];
          
          let inserted = false;
          for (const pattern of insertPatterns) {
            const match = updatedContent.match(pattern);
            if (match && match[1]) {
              // Add compliance link to this paragraph
              const originalParagraph = match[1];
              const complianceLink = ` For more information about our regulatory standards, visit our <a href="${COMPLIANCE_URL}">GDP Compliance Framework</a>.`;
              const updatedParagraph = originalParagraph.replace('</p>', `${complianceLink}</p>`);
              updatedContent = updatedContent.replace(originalParagraph, updatedParagraph);
              inserted = true;
              break;
            }
          }
          
          if (!inserted) {
            // Fallback: Add a new paragraph before the disclaimer
            // Match the full disclaimer div opening to preserve all attributes
            const disclaimerPattern = /(<div style="background-color: #f8f9fa; border-left: 4px solid #0066cc; padding: 16px; margin-top: 24px;">)/;
            const disclaimerMatch = updatedContent.match(disclaimerPattern);
            if (disclaimerMatch && disclaimerMatch[1]) {
              const complianceParagraph = `<p>Learn more about how Pharma Oasis maintains the highest standards of pharmaceutical distribution by visiting our <a href="${COMPLIANCE_URL}">GDP Compliance Framework</a>.</p>\n\n`;
              updatedContent = updatedContent.replace(disclaimerMatch[1], complianceParagraph + disclaimerMatch[1]);
              inserted = true;
            }
          }

          if (inserted) {
            await storage.updateBlogPost(post.id, { content: updatedContent });
            results.updated++;
            results.details.push({ id: post.id, title: post.title, status: 'updated' });
          } else {
            results.skipped++;
            results.details.push({ id: post.id, title: post.title, status: 'skipped', reason: 'No suitable insertion point found' });
          }
        } catch (err) {
          results.errors++;
          results.details.push({ id: post.id, title: post.title, status: 'error', reason: String(err) });
        }
      }

      res.json({
        message: `Processed ${results.processed} posts: ${results.updated} updated, ${results.skipped} skipped, ${results.errors} errors`,
        ...results
      });
    } catch (error) {
      console.error("Error inserting compliance links:", error);
      res.status(500).json({ message: "Failed to insert compliance links" });
    }
  });

  // Check if a page exists (for frontend safe fallback)
  app.get("/api/pages/exists/:slug", async (req, res) => {
    const validPages = ['compliance', 'products', 'brands', 'how-to-order', 'distribution-network', 'contact', 'blog', 'register'];
    const exists = validPages.includes(req.params.slug);
    res.json({ exists, slug: req.params.slug });
  });

  // Admin - Contact Messages
  app.get("/api/admin/messages", requireAdmin, async (req, res) => {
    try {
      const messages = await storage.getAllContactMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.patch("/api/admin/messages/:id/read", requireAdmin, async (req, res) => {
    try {
      const message = await storage.updateContactMessage(Number(req.params.id), { status: "read" });
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      res.json(message);
    } catch (error) {
      res.status(500).json({ message: "Failed to update message" });
    }
  });

  app.delete("/api/admin/messages/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteContactMessage(Number(req.params.id));
      res.json({ message: "Message deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Admin - CMS
  app.get("/api/admin/cms", requireAdmin, async (req, res) => {
    try {
      const blocks = await storage.getAllCmsBlocks();
      res.json(blocks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch CMS blocks" });
    }
  });

  app.post("/api/admin/cms", requireAdmin, async (req, res) => {
    try {
      const block = await storage.createCmsBlock(req.body);
      res.status(201).json(block);
    } catch (error) {
      res.status(500).json({ message: "Failed to create CMS block" });
    }
  });

  app.patch("/api/admin/cms/:id", requireAdmin, async (req, res) => {
    try {
      const block = await storage.updateCmsBlockById(Number(req.params.id), req.body);
      if (!block) {
        return res.status(404).json({ message: "Block not found" });
      }
      res.json(block);
    } catch (error) {
      res.status(500).json({ message: "Failed to update CMS block" });
    }
  });

  app.delete("/api/admin/cms/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteCmsBlockById(Number(req.params.id));
      res.json({ message: "Block deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete block" });
    }
  });

  // Admin - Settings
  app.get("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.patch("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      // Convert camelCase keys to snake_case for database storage
      const camelToSnake = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      const convertedBody: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.body)) {
        const snakeKey = camelToSnake(key);
        convertedBody[snakeKey] = String(value);
      }
      const settings = await storage.updateSiteSettings(convertedBody);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to save settings" });
    }
  });

  // Admin - Seed Database (for production)
  app.post("/api/admin/seed-database", requireAdmin, async (req, res) => {
    try {
      const { seed } = await import("./seed");
      await seed();
      res.json({ success: true, message: "Database seeded successfully with demo data" });
    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ message: "Failed to seed database", error: String(error) });
    }
  });

  // Admin - Dashboard Stats
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const [users, products, quotes, pendingUsers, pendingQuotes] = await Promise.all([
        storage.getAllUsers(),
        storage.getProductCount(),
        storage.getAllQuotes(),
        storage.getUsersByStatus("pending"),
        storage.getQuotesByStatus("pending"),
      ]);

      res.json({
        totalUsers: users.length,
        totalProducts: products,
        totalQuotes: quotes.length,
        pendingApprovals: pendingUsers.length,
        pendingQuotes: pendingQuotes.length,
        activeCustomers: users.filter(u => u.role === "customer" && u.status === "active").length,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // ==================== HOMEPAGE CONTENT (PUBLIC) ====================
  app.get("/api/home/slides", async (req, res) => {
    try {
      const slides = await storage.getActiveHeroSlides();
      res.json(slides);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch slides" });
    }
  });

  app.get("/api/home/brands", async (req, res) => {
    try {
      const brands = await storage.getFeaturedBrands();
      res.json(brands);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch featured brands" });
    }
  });

  // Public site settings (contact info, etc.)
  app.get("/api/site-settings", async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch site settings" });
    }
  });

  // Company locations (public - for footer/contact page)
  app.get("/api/company-locations", async (req, res) => {
    try {
      const locations = await storage.getActiveCompanyLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch company locations" });
    }
  });

  // Homepage stats (public)
  app.get("/api/home/stats", async (req, res) => {
    try {
      const stats = await storage.getActiveHomeStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch home stats" });
    }
  });

  // Homepage features (public)
  app.get("/api/home/features", async (req, res) => {
    try {
      const features = await storage.getActiveHomeFeatures();
      res.json(features);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch home features" });
    }
  });

  // Homepage categories (public)
  app.get("/api/home/categories", async (req, res) => {
    try {
      const categories = await storage.getActiveHomeCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch home categories" });
    }
  });

  // Homepage process steps (public)
  app.get("/api/home/process-steps", async (req, res) => {
    try {
      const steps = await storage.getActiveHomeProcessSteps();
      res.json(steps);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch process steps" });
    }
  });

  // Homepage sections (public)
  app.get("/api/home/sections", async (req, res) => {
    try {
      const sections = await storage.getActiveHomeSections();
      res.json(sections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch home sections" });
    }
  });

  // ==================== ADMIN - OFFERS ====================
  app.get("/api/admin/offers", requireAdmin, async (req, res) => {
    try {
      const allOffers = await storage.getAllOffers();
      res.json(allOffers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch offers" });
    }
  });

  app.post("/api/admin/offers", requireAdmin, async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.startDate) data.startDate = new Date(data.startDate);
      if (data.endDate) data.endDate = new Date(data.endDate);
      const offer = await storage.createOffer(data);
      res.status(201).json(offer);
    } catch (error) {
      console.error("Error creating offer:", error);
      res.status(500).json({ message: "Failed to create offer" });
    }
  });

  app.patch("/api/admin/offers/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const data = { ...req.body };
      if (data.startDate) data.startDate = new Date(data.startDate);
      if (data.endDate) data.endDate = new Date(data.endDate);
      const updated = await storage.updateOffer(id, data);
      if (!updated) return res.status(404).json({ message: "Offer not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating offer:", error);
      res.status(500).json({ message: "Failed to update offer" });
    }
  });

  app.delete("/api/admin/offers/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteOffer(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting offer:", error);
      res.status(500).json({ message: "Failed to delete offer" });
    }
  });

  app.get("/api/admin/offers/:id/items", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const items = await storage.getOfferItems(id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch offer items" });
    }
  });

  app.post("/api/admin/offers/:id/items", requireAdmin, async (req, res) => {
    try {
      const offerId = Number(req.params.id);
      const body = { ...req.body };
      if (body.offerPrice === '' || body.offerPrice === undefined) body.offerPrice = null;
      if (body.originalPrice === '' || body.originalPrice === undefined) body.originalPrice = null;
      const item = await storage.createOfferItem({ ...body, offerId });
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding offer item:", error);
      res.status(500).json({ message: "Failed to add offer item" });
    }
  });

  app.patch("/api/admin/offer-items/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const updated = await storage.updateOfferItem(id, req.body);
      if (!updated) return res.status(404).json({ message: "Offer item not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update offer item" });
    }
  });

  app.delete("/api/admin/offer-items/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteOfferItem(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete offer item" });
    }
  });

  // ==================== ADMIN - OFFER AI CONTENT GENERATION ====================
  app.post("/api/admin/offers/generate-content", requireAdmin, async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ message: "Prompt is required" });
      }

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a marketing copywriter for Pharma Oasis, a UK B2B pharmaceutical wholesale platform. Generate promotional offer content based on the user's prompt. Return JSON only, no markdown.

Return this exact JSON structure:
{
  "title": "Short catchy offer title (max 60 chars)",
  "slug": "url-friendly-slug",
  "description": "2-3 sentence description of the offer for the listing page (max 200 chars)",
  "heroTitle": "Bold headline for the hero banner (max 50 chars)",
  "heroSubtitle": "Supporting text for the hero banner (max 100 chars)",
  "badgeText": "Short badge label like SALE, HOT DEAL, NEW (max 12 chars, uppercase)",
  "badgeColor": "one of: red, green, blue, orange, purple, yellow",
  "displayStyle": "one of: grid, featured, list",
  "heroImagePrompt": "A detailed image generation prompt for a professional pharmaceutical/healthcare themed banner image. Be specific about colors, style, composition. The image should be 1920x720 landscape format, clean and professional."
}

Keep language professional, compliant with UK pharmaceutical regulations. Never make medical claims. Focus on value, savings, and quality.`
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const content = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(content);
    } catch (error: any) {
      console.error("Error generating offer content:", error);
      res.status(500).json({ message: "Failed to generate content: " + (error.message || "Unknown error") });
    }
  });

  app.post("/api/admin/offers/generate-hero-image", requireAdmin, async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ message: "Image prompt is required" });
      }

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You design professional pharmaceutical banner color schemes. Based on the user's offer description, return a JSON object with these fields:
{
  "gradientStart": "#hex color for gradient start (left side)",
  "gradientEnd": "#hex color for gradient end (right side)", 
  "accentColor": "#hex color for decorative accent elements",
  "style": "one of: healthcare, baby, wellness, pharma, seasonal"
}
Use professional, clean pharmaceutical colors. For baby products use soft pastels. For wellness use greens. For pharma use blues. For seasonal use warm tones. Return ONLY valid JSON.`
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const colors = JSON.parse(completion.choices[0].message.content || '{"gradientStart":"#1e40af","gradientEnd":"#3b82f6","accentColor":"#60a5fa","style":"healthcare"}');

      const sharp = (await import("sharp")).default;

      const width = 1920;
      const height = 720;

      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 30, g: 64, b: 175 };
      };

      const startRgb = hexToRgb(colors.gradientStart);
      const endRgb = hexToRgb(colors.gradientEnd);
      const accentRgb = hexToRgb(colors.accentColor);

      const svgImage = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:rgb(${startRgb.r},${startRgb.g},${startRgb.b});stop-opacity:1" />
            <stop offset="100%" style="stop-color:rgb(${endRgb.r},${endRgb.g},${endRgb.b});stop-opacity:1" />
          </linearGradient>
          <radialGradient id="glow1" cx="80%" cy="30%" r="40%">
            <stop offset="0%" style="stop-color:rgb(${accentRgb.r},${accentRgb.g},${accentRgb.b});stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:rgb(${accentRgb.r},${accentRgb.g},${accentRgb.b});stop-opacity:0" />
          </radialGradient>
          <radialGradient id="glow2" cx="20%" cy="70%" r="35%">
            <stop offset="0%" style="stop-color:rgb(255,255,255);stop-opacity:0.15" />
            <stop offset="100%" style="stop-color:rgb(255,255,255);stop-opacity:0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)" />
        <rect width="100%" height="100%" fill="url(#glow1)" />
        <rect width="100%" height="100%" fill="url(#glow2)" />
        <circle cx="85%" cy="25%" r="120" fill="rgb(255,255,255)" fill-opacity="0.08" />
        <circle cx="75%" cy="60%" r="80" fill="rgb(255,255,255)" fill-opacity="0.06" />
        <circle cx="15%" cy="35%" r="60" fill="rgb(255,255,255)" fill-opacity="0.05" />
        <circle cx="90%" cy="75%" r="40" fill="rgb(${accentRgb.r},${accentRgb.g},${accentRgb.b})" fill-opacity="0.15" />
        <rect x="0" y="700" width="100%" height="20" fill="rgb(255,255,255)" fill-opacity="0.1" />
        <line x1="60%" y1="0" x2="90%" y2="100%" stroke="rgb(255,255,255)" stroke-opacity="0.05" stroke-width="2" />
        <line x1="65%" y1="0" x2="95%" y2="100%" stroke="rgb(255,255,255)" stroke-opacity="0.03" stroke-width="1" />
      </svg>`;

      const buffer = await sharp(Buffer.from(svgImage))
        .resize(width, height)
        .webp({ quality: 85 })
        .toBuffer();

      const objectStorage = new ObjectStorageService();
      if (!objectStorage.isConfigured()) {
        return res.status(503).json({ message: "Object Storage not configured" });
      }

      const filename = `hero-offer-${Date.now()}.webp`;
      const imageUrl = await objectStorage.uploadBuffer(buffer, "hero", filename, "image/webp");

      await storage.createMediaAsset({
        filename,
        originalFilename: filename,
        mimeType: "image/webp",
        fileSize: buffer.length,
        width,
        height,
        category: "hero",
        url: imageUrl,
        thumbnailUrl: null,
        altText: "AI generated offer banner",
        uploadedBy: (req as any).user?.id || null,
      });

      res.json({ imageUrl });
    } catch (error: any) {
      console.error("Error generating hero image:", error);
      res.status(500).json({ message: "Failed to generate image: " + (error.message || "Unknown error") });
    }
  });

  // ==================== ADMIN - HERO SLIDES ====================
  app.get("/api/admin/hero-slides", requireAdmin, async (req, res) => {
    try {
      const slides = await storage.getAllHeroSlides();
      res.json(slides);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch hero slides" });
    }
  });

  app.post("/api/admin/hero-slides", requireAdmin, async (req, res) => {
    try {
      const slide = await storage.createHeroSlide(req.body);
      res.status(201).json(slide);
    } catch (error) {
      res.status(500).json({ message: "Failed to create hero slide" });
    }
  });

  app.patch("/api/admin/hero-slides/:id", requireAdmin, async (req, res) => {
    try {
      const slide = await storage.updateHeroSlide(Number(req.params.id), req.body);
      if (!slide) {
        return res.status(404).json({ message: "Slide not found" });
      }
      res.json(slide);
    } catch (error) {
      res.status(500).json({ message: "Failed to update hero slide" });
    }
  });

  app.delete("/api/admin/hero-slides/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteHeroSlide(Number(req.params.id));
      res.json({ message: "Slide deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete slide" });
    }
  });

  app.post("/api/admin/hero-slides/reorder", requireAdmin, async (req, res) => {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ message: "orderedIds must be an array" });
      }
      await storage.reorderHeroSlides(orderedIds);
      res.json({ message: "Slides reordered successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reorder slides" });
    }
  });

  // ==================== ADMIN - FEATURED BRANDS ====================
  app.patch("/api/admin/brands/:id/home-featured", requireAdmin, async (req, res) => {
    try {
      const { isHomeFeatured, homePosition } = req.body;
      const brand = await storage.updateBrandHomeFeatured(
        Number(req.params.id),
        isHomeFeatured,
        homePosition
      );
      if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
      }
      res.json(brand);
    } catch (error) {
      res.status(500).json({ message: "Failed to update brand homepage status" });
    }
  });

  // ==================== ADMIN - COMPANY LOCATIONS ====================
  app.get("/api/admin/company-locations", requireAdmin, async (req, res) => {
    try {
      const locations = await storage.getAllCompanyLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch company locations" });
    }
  });

  app.post("/api/admin/company-locations", requireAdmin, async (req, res) => {
    try {
      const location = await storage.createCompanyLocation(req.body);
      res.status(201).json(location);
    } catch (error) {
      res.status(500).json({ message: "Failed to create company location" });
    }
  });

  app.patch("/api/admin/company-locations/:id", requireAdmin, async (req, res) => {
    try {
      const location = await storage.updateCompanyLocation(Number(req.params.id), req.body);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json(location);
    } catch (error) {
      res.status(500).json({ message: "Failed to update company location" });
    }
  });

  app.delete("/api/admin/company-locations/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteCompanyLocation(Number(req.params.id));
      res.json({ message: "Location deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete location" });
    }
  });

  // ==================== ADMIN - HOME STATS ====================
  app.get("/api/admin/home-stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAllHomeStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch home stats" });
    }
  });

  app.post("/api/admin/home-stats", requireAdmin, async (req, res) => {
    try {
      const stat = await storage.createHomeStat(req.body);
      res.status(201).json(stat);
    } catch (error) {
      res.status(500).json({ message: "Failed to create home stat" });
    }
  });

  app.patch("/api/admin/home-stats/:id", requireAdmin, async (req, res) => {
    try {
      const stat = await storage.updateHomeStat(Number(req.params.id), req.body);
      if (!stat) {
        return res.status(404).json({ message: "Stat not found" });
      }
      res.json(stat);
    } catch (error) {
      res.status(500).json({ message: "Failed to update home stat" });
    }
  });

  app.delete("/api/admin/home-stats/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteHomeStat(Number(req.params.id));
      res.json({ message: "Stat deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete stat" });
    }
  });

  // ==================== ADMIN - HOME FEATURES ====================
  app.get("/api/admin/home-features", requireAdmin, async (req, res) => {
    try {
      const features = await storage.getAllHomeFeatures();
      res.json(features);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch home features" });
    }
  });

  app.post("/api/admin/home-features", requireAdmin, async (req, res) => {
    try {
      const feature = await storage.createHomeFeature(req.body);
      res.status(201).json(feature);
    } catch (error) {
      res.status(500).json({ message: "Failed to create home feature" });
    }
  });

  app.patch("/api/admin/home-features/:id", requireAdmin, async (req, res) => {
    try {
      const feature = await storage.updateHomeFeature(Number(req.params.id), req.body);
      if (!feature) {
        return res.status(404).json({ message: "Feature not found" });
      }
      res.json(feature);
    } catch (error) {
      res.status(500).json({ message: "Failed to update home feature" });
    }
  });

  app.delete("/api/admin/home-features/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteHomeFeature(Number(req.params.id));
      res.json({ message: "Feature deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete feature" });
    }
  });

  // ==================== ADMIN - HOME CATEGORIES ====================
  app.get("/api/admin/home-categories", requireAdmin, async (req, res) => {
    try {
      const categories = await storage.getAllHomeCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch home categories" });
    }
  });

  app.post("/api/admin/home-categories", requireAdmin, async (req, res) => {
    try {
      const category = await storage.createHomeCategory(req.body);
      res.status(201).json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to create home category" });
    }
  });

  app.patch("/api/admin/home-categories/:id", requireAdmin, async (req, res) => {
    try {
      const category = await storage.updateHomeCategory(Number(req.params.id), req.body);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to update home category" });
    }
  });

  app.delete("/api/admin/home-categories/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteHomeCategory(Number(req.params.id));
      res.json({ message: "Category deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // ==================== ADMIN - HOME PROCESS STEPS ====================
  app.get("/api/admin/home-process-steps", requireAdmin, async (req, res) => {
    try {
      const steps = await storage.getAllHomeProcessSteps();
      res.json(steps);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch process steps" });
    }
  });

  app.post("/api/admin/home-process-steps", requireAdmin, async (req, res) => {
    try {
      const step = await storage.createHomeProcessStep(req.body);
      res.status(201).json(step);
    } catch (error) {
      res.status(500).json({ message: "Failed to create process step" });
    }
  });

  app.patch("/api/admin/home-process-steps/:id", requireAdmin, async (req, res) => {
    try {
      const step = await storage.updateHomeProcessStep(Number(req.params.id), req.body);
      if (!step) {
        return res.status(404).json({ message: "Step not found" });
      }
      res.json(step);
    } catch (error) {
      res.status(500).json({ message: "Failed to update process step" });
    }
  });

  app.delete("/api/admin/home-process-steps/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteHomeProcessStep(Number(req.params.id));
      res.json({ message: "Step deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete step" });
    }
  });

  // ==================== ADMIN - HOME SECTIONS ====================
  app.get("/api/admin/home-sections", requireAdmin, async (req, res) => {
    try {
      const sections = await storage.getAllHomeSections();
      res.json(sections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch home sections" });
    }
  });

  app.post("/api/admin/home-sections", requireAdmin, async (req, res) => {
    try {
      const section = await storage.createHomeSection(req.body);
      res.status(201).json(section);
    } catch (error) {
      res.status(500).json({ message: "Failed to create home section" });
    }
  });

  app.patch("/api/admin/home-sections/:id", requireAdmin, async (req, res) => {
    try {
      const section = await storage.updateHomeSection(Number(req.params.id), req.body);
      if (!section) {
        return res.status(404).json({ message: "Section not found" });
      }
      res.json(section);
    } catch (error) {
      res.status(500).json({ message: "Failed to update home section" });
    }
  });

  app.delete("/api/admin/home-sections/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteHomeSection(Number(req.params.id));
      res.json({ message: "Section deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete section" });
    }
  });

  // ==================== ADMIN - FOOTER SECTIONS ====================
  app.get("/api/footer-sections", async (req, res) => {
    try {
      const sections = await storage.getActiveFooterSections();
      res.json(sections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch footer sections" });
    }
  });

  app.get("/api/footer-sections/:key", async (req, res) => {
    try {
      const section = await storage.getFooterSectionByKey(req.params.key);
      if (!section) {
        return res.status(404).json({ message: "Section not found" });
      }
      res.json(section);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch footer section" });
    }
  });

  app.get("/api/admin/footer-sections", requireAdmin, async (req, res) => {
    try {
      const sections = await storage.getAllFooterSections();
      res.json(sections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch footer sections" });
    }
  });

  app.post("/api/admin/footer-sections", requireAdmin, async (req, res) => {
    try {
      const section = await storage.createFooterSection(req.body);
      res.status(201).json(section);
    } catch (error) {
      res.status(500).json({ message: "Failed to create footer section" });
    }
  });

  app.patch("/api/admin/footer-sections/:id", requireAdmin, async (req, res) => {
    try {
      const section = await storage.updateFooterSection(Number(req.params.id), req.body);
      if (!section) {
        return res.status(404).json({ message: "Section not found" });
      }
      res.json(section);
    } catch (error) {
      res.status(500).json({ message: "Failed to update footer section" });
    }
  });

  app.delete("/api/admin/footer-sections/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteFooterSection(Number(req.params.id));
      res.json({ message: "Section deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete footer section" });
    }
  });

  // ==================== ADMIN - IMAGE UPLOADS ====================
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  // ==================== CUSTOMER PRICING — COST UPLOADS ====================
  const COST_THRESHOLD_KEY = "cost_change_threshold";

  async function getCostThreshold(): Promise<number> {
    const settings = await storage.getSiteSettings();
    const v = parseFloat(settings[COST_THRESHOLD_KEY] ?? "");
    return Number.isFinite(v) && v > 0 ? v : 30;
  }

  const parseDate = (v: any): Date | null => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  // Download a blank cost-upload template (xlsx)
  app.get("/api/admin/cost-template", requireAdmin, (req, res) => {
    const buf = buildTemplateWorkbook();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="cost-upload-template.xlsx"');
    res.send(buf);
  });

  // Upload a brand cost file -> parse, match, flag, save as DRAFT (not yet live)
  app.post("/api/admin/cost-uploads", requireAdmin, upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const brandId = parseInt(req.body.brandId, 10);
      if (!brandId) return res.status(400).json({ message: "brandId is required" });

      const parsed = parseCostFile(req.file.buffer);
      if (!parsed.rows.length) {
        return res.status(400).json({ message: "No data rows found. Check the file matches the template format." });
      }
      const threshold = await getCostThreshold();
      // Compare against the brand's prior PUBLISHED cost upload (same pricing_brands
      // id namespace) — NOT the catalogue products table.
      const base = await pricingV2.getBaseCostForBrand(brandId);
      const summary = buildPreview(parsed, base?.rows ?? [], threshold);

      const upload = await pricingStore.createDraftUpload({
        brandId,
        supplierName: req.body.supplierName || null,
        validFrom: parseDate(req.body.validFrom),
        validUntil: parseDate(req.body.validUntil),
        comment: req.body.comment || null,
        fileName: req.file.originalname || null,
        uploadedBy: req.session.userId,
        rows: summary.rows,
      });

      res.json({ upload, summary: { ...summary, threshold } });
    } catch (error: any) {
      console.error("Cost upload error:", error);
      res.status(500).json({ message: error.message || "Failed to process cost upload" });
    }
  });

  // Save edits made in the review screen (inline cost/EAN/notes fixes, carried-forward
  // "kept" missing products, and the upload-level comment), then re-validate + return
  // a fresh preview. Draft only.
  app.patch("/api/admin/cost-uploads/:id/draft", requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const found = await pricingStore.getUpload(id);
      if (!found) return res.status(404).json({ message: "Upload not found" });
      if (found.upload.status === "published")
        return res.status(400).json({ message: "This upload is already published and cannot be edited." });

      const threshold = await getCostThreshold();
      const base = await pricingV2.getBaseCostForBrand(found.upload.brandId);
      const priorRows = base?.rows ?? [];

      const incoming: any[] = Array.isArray(req.body.rows) ? req.body.rows : [];
      const finalRows: ParsedCostRow[] = incoming.map((r) => ({
        ean: (r.ean ?? "").toString(),
        description: (r.description ?? "").toString(),
        caseSize: (r.caseSize ?? "").toString(),
        costPrice: r.costPrice === null || r.costPrice === undefined || r.costPrice === "" ? null : Number(r.costPrice),
        supplierQty: r.supplierQty === null || r.supplierQty === undefined || r.supplierQty === "" ? null : Number(r.supplierQty),
        categoryName: (r.categoryName ?? "").toString(),
        comment: r.comment ? r.comment.toString() : null,
      }));

      // Carry forward "kept" missing products at their previous cost.
      const keepEans: string[] = Array.isArray(req.body.keepMissingEans) ? req.body.keepMissingEans : [];
      if (keepEans.length) {
        const normEan = (v: any) => (v ?? "").toString().replace(/\s+/g, "").replace(/\.0$/, "").trim();
        const present = new Set(finalRows.map((r) => normEan(r.ean)));
        const priorByEan = new Map<string, any>();
        for (const p of priorRows) priorByEan.set(normEan(p.ean), p);
        for (const e of keepEans) {
          const k = normEan(e);
          if (!k || present.has(k)) continue;
          const p = priorByEan.get(k);
          if (!p) continue;
          finalRows.push({
            ean: (p.ean ?? "").toString(),
            description: (p.description ?? "").toString(),
            caseSize: (p.caseSize ?? "").toString(),
            costPrice: p.costPrice === null || p.costPrice === undefined ? null : Number(p.costPrice),
            supplierQty: p.supplierQty ?? null,
            categoryName: (p.categoryName ?? "").toString(),
            comment: "Kept from previous cost (not in new file)",
          });
          present.add(k);
        }
      }

      const summary = analyzeRows(finalRows, priorRows, threshold);
      await pricingStore.replaceDraftRows(id, summary.rows);
      if (req.body.comment !== undefined) await pricingStore.updateUploadComment(id, req.body.comment || null);

      res.json({ summary: { ...summary, threshold } });
    } catch (error: any) {
      console.error("Cost draft save error:", error);
      res.status(500).json({ message: error.message || "Failed to save changes" });
    }
  });

  app.get("/api/admin/cost-uploads", requireAdmin, async (req, res) => {
    const brandId = req.query.brandId ? parseInt(req.query.brandId as string, 10) : undefined;
    res.json(await pricingStore.listUploads(brandId));
  });

  app.get("/api/admin/cost-uploads/:id", requireAdmin, async (req, res) => {
    const found = await pricingStore.getUpload(parseInt(req.params.id, 10));
    if (!found) return res.status(404).json({ message: "Upload not found" });
    res.json(found);
  });

  app.post("/api/admin/cost-uploads/:id/publish", requireAdmin, async (req, res) => {
    try {
      const result = await pricingStore.publishUpload(parseInt(req.params.id, 10));
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to publish" });
    }
  });

  app.delete("/api/admin/cost-uploads/:id", requireAdmin, async (req, res) => {
    await pricingStore.deleteUpload(parseInt(req.params.id, 10));
    res.json({ success: true });
  });

  // Expired-cost alert for the admin dashboard
  app.get("/api/admin/cost-alerts", requireAdmin, async (req, res) => {
    await pricingStore.refreshExpiredCosts();
    res.json(await pricingStore.expiredCostBrands());
  });

  // ===== CURRENT COSTS — view & quick-edit a brand's live costs =====
  app.get("/api/admin/current-costs/:brandId", requireAdmin, async (req, res) => {
    try {
      res.json(await pricingV2.getCurrentCosts(parseInt(req.params.brandId, 10)));
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to load current costs" });
    }
  });
  // Impact preview: which customer prices change if these cost edits are applied.
  app.post("/api/admin/current-costs/:brandId/preview", requireAdmin, async (req, res) => {
    try {
      const edits = Array.isArray(req.body?.edits) ? req.body.edits : [];
      res.json(await pricingV2.previewCostEdits(parseInt(req.params.brandId, 10), edits));
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to preview cost edits" });
    }
  });
  // Apply: publish a new cost version + reprice affected customer lists.
  app.post("/api/admin/current-costs/:brandId/apply", requireAdmin, async (req: any, res) => {
    try {
      const edits = Array.isArray(req.body?.edits) ? req.body.edits : [];
      const result = await pricingV2.applyCostEdits(parseInt(req.params.brandId, 10), edits, {
        uploadedBy: req.session?.userId ?? null,
      });
      res.json({ success: true, ...result });
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Failed to apply cost edits" });
    }
  });

  // ==================== PRICING v2 — STANDALONE BRANDS ====================
  app.get("/api/admin/pricing-brands", requireAdmin, async (req, res) => {
    res.json(await pricingV2.listPricingBrands());
  });
  app.post("/api/admin/pricing-brands", requireAdmin, async (req, res) => {
    try {
      if (!req.body.name?.trim()) return res.status(400).json({ message: "Name is required" });
      res.json(await pricingV2.createPricingBrand(req.body));
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to create brand" });
    }
  });
  app.put("/api/admin/pricing-brands/:id", requireAdmin, async (req, res) => {
    res.json(await pricingV2.updatePricingBrand(parseInt(req.params.id, 10), req.body));
  });
  app.delete("/api/admin/pricing-brands/:id", requireAdmin, async (req, res) => {
    await pricingV2.deletePricingBrand(parseInt(req.params.id, 10));
    res.json({ success: true });
  });

  // ==================== PRICING v2 — STANDALONE CATEGORIES ====================
  app.get("/api/admin/pricing-categories", requireAdmin, async (req, res) => {
    res.json(await pricingV2.listPricingCategories());
  });
  app.post("/api/admin/pricing-categories", requireAdmin, async (req, res) => {
    try {
      if (!req.body.name?.trim()) return res.status(400).json({ message: "Name is required" });
      res.json(await pricingV2.createPricingCategory(req.body));
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to create category" });
    }
  });
  app.put("/api/admin/pricing-categories/:id", requireAdmin, async (req, res) => {
    res.json(await pricingV2.updatePricingCategory(parseInt(req.params.id, 10), req.body));
  });
  app.delete("/api/admin/pricing-categories/:id", requireAdmin, async (req, res) => {
    await pricingV2.deletePricingCategory(parseInt(req.params.id, 10));
    res.json({ success: true });
  });

  // ==================== PRICING v2 — PRICE LIST BUILDER ====================
  // List all saved price lists (optionally for one brand), with item & customer counts.
  app.get("/api/admin/v2/price-lists", requireAdmin, async (req, res) => {
    const brandId = req.query.brandId ? parseInt(req.query.brandId as string, 10) : undefined;
    const archived = req.query.archived === "only" ? "only" : req.query.archived === "include" ? "include" : "exclude";
    res.json(await pricingV2.listPriceListsV2(brandId, archived));
  });

  // Full list with its prepared items (ADMIN view — includes cost).
  app.get("/api/admin/v2/price-lists/:id", requireAdmin, async (req, res) => {
    const found = await pricingV2.getPriceListFull(parseInt(req.params.id, 10));
    if (!found) return res.status(404).json({ message: "Price list not found" });
    res.json(found);
  });

  // Create + auto-fill from the brand's base cost at a default margin.
  app.post("/api/admin/v2/price-lists", requireAdmin, async (req, res) => {
    try {
      const brandId = parseInt(req.body.brandId, 10);
      const name = (req.body.name || "").trim();
      const defaultMarginPercent = Number(req.body.defaultMarginPercent) || 0;
      if (!brandId) return res.status(400).json({ message: "brandId is required" });
      if (!name) return res.status(400).json({ message: "name is required" });
      const result = await pricingV2.buildPriceList({ brandId, name, defaultMarginPercent });
      if (result.itemCount === 0) {
        return res.json({ ...result, warning: "No published base cost found for this brand yet — the list was created empty. Upload & publish a cost first." });
      }
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to build price list" });
    }
  });

  app.put("/api/admin/v2/price-lists/:id", requireAdmin, async (req, res) => {
    res.json(await pricingV2.updatePriceListMeta(parseInt(req.params.id, 10), req.body));
  });

  // Apply a default margin to all margin-method items at once.
  app.post("/api/admin/v2/price-lists/:id/apply-margin", requireAdmin, async (req, res) => {
    const margin = Number(req.body.marginPercent) || 0;
    const n = await pricingV2.applyDefaultMargin(parseInt(req.params.id, 10), margin);
    res.json({ updated: n });
  });

  // Save per-item overrides (method / margin / fixed / cost_plus); recomputes prices.
  app.put("/api/admin/v2/price-lists/:id/items", requireAdmin, async (req, res) => {
    try {
      const patches = Array.isArray(req.body.items) ? req.body.items : [];
      const n = await pricingV2.updatePriceListItems(parseInt(req.params.id, 10), patches);
      const found = await pricingV2.getPriceListFull(parseInt(req.params.id, 10));
      res.json({ updated: n, ...found });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to update items" });
    }
  });

  // Re-pull base cost into the list (margins recompute; fixed kept for review).
  app.post("/api/admin/v2/price-lists/:id/refresh-cost", requireAdmin, async (req, res) => {
    res.json(await pricingV2.refreshFromBaseCost(parseInt(req.params.id, 10)));
  });

  // Reconcile a new base cost against the saved list — preview the changed /
  // new / missing products before applying anything.
  app.get("/api/admin/v2/price-lists/:id/reconcile", requireAdmin, async (req, res) => {
    try {
      res.json(await pricingV2.reconcilePreview(parseInt(req.params.id, 10)));
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to build reconciliation" });
    }
  });

  // Apply the admin's reviewed reconciliation decisions.
  app.post("/api/admin/v2/price-lists/:id/reconcile", requireAdmin, async (req, res) => {
    try {
      const result = await pricingV2.reconcileApply(parseInt(req.params.id, 10), {
        applyChangedItemIds: Array.isArray(req.body.applyChangedItemIds) ? req.body.applyChangedItemIds : [],
        addNewEans: Array.isArray(req.body.addNewEans) ? req.body.addNewEans : [],
        newMarginPercent: req.body.newMarginPercent ?? null,
        removeMissingItemIds: Array.isArray(req.body.removeMissingItemIds) ? req.body.removeMissingItemIds : [],
      });
      const found = await pricingV2.getPriceListFull(parseInt(req.params.id, 10));
      res.json({ ...result, ...found });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to apply reconciliation" });
    }
  });

  // Archive (soft-delete): unassigns customers, hides from the active list, restorable.
  app.post("/api/admin/v2/price-lists/:id/archive", requireAdmin, async (req, res) => {
    res.json(await pricingV2.archivePriceListV2(parseInt(req.params.id, 10)));
  });

  // Restore an archived list back to draft.
  app.post("/api/admin/v2/price-lists/:id/restore", requireAdmin, async (req, res) => {
    res.json(await pricingV2.restorePriceListV2(parseInt(req.params.id, 10)));
  });

  // Permanent delete (used only from the Archived view).
  app.delete("/api/admin/v2/price-lists/:id", requireAdmin, async (req, res) => {
    await pricingV2.deletePriceListV2(parseInt(req.params.id, 10));
    res.json({ success: true });
  });

  // ----- Assignment (one list per customer PER BRAND, enforced) -----
  app.get("/api/admin/v2/price-lists/:id/customers", requireAdmin, async (req, res) => {
    res.json(await pricingV2.customersForList(parseInt(req.params.id, 10)));
  });

  app.post("/api/admin/v2/price-lists/:id/assign", requireAdmin, async (req: any, res) => {
    try {
      const listId = parseInt(req.params.id, 10);
      const replace = !!req.body.replace;
      const assignedBy = req.session?.userId ?? null;
      if (req.body.all === true) {
        const assigned = await pricingV2.assignAllCustomers(listId, assignedBy);
        return res.json({ assigned, conflicts: [] });
      }
      const customerIds: number[] = (Array.isArray(req.body.customerIds) ? req.body.customerIds : []).map(Number);
      const result = await pricingV2.assignCustomers(listId, customerIds, { replace, assignedBy });
      if (result.conflicts.length && !replace) {
        return res.status(409).json({
          message: "Some customers already have a different list for this brand.",
          ...result,
        });
      }
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to assign" });
    }
  });

  app.post("/api/admin/v2/price-lists/:id/unassign", requireAdmin, async (req, res) => {
    await pricingV2.unassignCustomer(parseInt(req.params.id, 10), Number(req.body.customerId));
    res.json({ success: true });
  });

  // A customer's current assignments (one per brand) — for the admin customer view.
  app.get("/api/admin/v2/customers/:id/assignments", requireAdmin, async (req, res) => {
    res.json(await pricingV2.assignmentsForCustomer(parseInt(req.params.id, 10)));
  });

  // Every assignment (which customers are on which list, per brand) — admin Assignments overview.
  app.get("/api/admin/v2/assignments", requireAdmin, async (_req, res) => {
    res.json(await pricingV2.allAssignments());
  });

  // ==================== CUSTOMER PRICING — PRICE LISTS (legacy v1) ====================
  app.get("/api/admin/price-lists", requireAdmin, async (req, res) => {
    res.json(await pricingStore.listPriceLists());
  });

  app.get("/api/admin/price-lists/:id", requireAdmin, async (req, res) => {
    const found = await pricingStore.getPriceListWithRules(parseInt(req.params.id, 10));
    if (!found) return res.status(404).json({ message: "Price list not found" });
    res.json(found);
  });

  app.post("/api/admin/price-lists", requireAdmin, async (req, res) => {
    try {
      const list = await pricingStore.createPriceList({
        name: req.body.name,
        type: req.body.type === "customer" ? "customer" : "tier",
        isActive: req.body.isActive ?? true,
        notes: req.body.notes || null,
      });
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to create price list" });
    }
  });

  app.put("/api/admin/price-lists/:id", requireAdmin, async (req, res) => {
    const list = await pricingStore.updatePriceList(parseInt(req.params.id, 10), {
      name: req.body.name,
      isActive: req.body.isActive,
      notes: req.body.notes,
    });
    res.json(list);
  });

  app.delete("/api/admin/price-lists/:id", requireAdmin, async (req, res) => {
    await pricingStore.deletePriceList(parseInt(req.params.id, 10));
    res.json({ success: true });
  });

  // Replace the full rule set for a price list
  app.put("/api/admin/price-lists/:id/rules", requireAdmin, async (req, res) => {
    try {
      const rules = Array.isArray(req.body.rules) ? req.body.rules : [];
      const saved = await pricingStore.setRules(parseInt(req.params.id, 10), rules);
      res.json(saved);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to save rules" });
    }
  });

  // Live price preview: resolve given products under a price list (ADMIN view, includes cost)
  app.post("/api/admin/price-lists/:id/preview-prices", requireAdmin, async (req, res) => {
    try {
      const listId = parseInt(req.params.id, 10);
      const ids: number[] = Array.isArray(req.body.productIds) ? req.body.productIds : [];
      const prods = (await Promise.all(ids.map((id) => storage.getProduct(id)))).filter(Boolean) as any[];
      const resolved = await resolveForList(listId, prods);
      res.json(Array.from(resolved.values()));
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to preview prices" });
    }
  });

  // Assign a price list to a customer
  app.post("/api/admin/customers/:id/price-list", requireAdmin, async (req, res) => {
    const priceListId = req.body.priceListId === null ? null : parseInt(req.body.priceListId, 10);
    await pricingStore.assignCustomerPriceList(parseInt(req.params.id, 10), priceListId);
    res.json({ success: true });
  });

  // ==================== CUSTOMER PORTAL (v2: prepared prices) ====================
  // Brands the customer has a nominated list for (drives portal brand filter).
  app.get("/api/portal/brands", requireActiveCustomer, async (req: any, res) => {
    const assignments = await pricingV2.assignmentsForCustomer(req.user.id);
    const seen = new Map<number, string | null>();
    for (const a of assignments) if (a.brandId != null) seen.set(a.brandId, a.brandName);
    res.json(Array.from(seen.entries()).map(([id, name]) => ({ id, name })));
  });

  // Pricing categories for the portal filter (active only).
  app.get("/api/portal/categories", requireActiveCustomer, async (req: any, res) => {
    const cats = await pricingV2.listPricingCategories();
    res.json(cats.filter((c) => c.isActive).map((c) => ({ id: c.id, name: c.name })));
  });

  // Catalogue priced for the logged-in customer (cost/margin never sent).
  app.get("/api/portal/products", requireActiveCustomer, async (req: any, res) => {
    try {
      const pageSize = Math.min(Number(req.query.limit) || 24, 100);
      const pageNum = Math.max(Number(req.query.page) || 1, 1);
      const all = await pricingV2.getCustomerCatalogue(req.user.id, {
        search: (req.query.search as string) || "",
        brandId: req.query.brand ? Number(req.query.brand) : undefined,
        categoryId: req.query.category ? Number(req.query.category) : undefined,
        availability: (req.query.availability as string) || "",
        sort: (req.query.sort as string) || "name",
      });
      const total = all.length;
      const start = (pageNum - 1) * pageSize;
      const products = all.slice(start, start + pageSize);
      res.json({ products, total, page: pageNum, pageSize, hasPriceList: total > 0 || (await pricingV2.customerListIds(req.user.id)).length > 0 });
    } catch (error: any) {
      console.error("Portal products error:", error);
      res.status(500).json({ message: "Failed to load products" });
    }
  });

  // Single prepared item priced for the customer (basket / detail view).
  app.get("/api/portal/products/:id", requireActiveCustomer, async (req: any, res) => {
    const it = await pricingV2.getCustomerItem(req.user.id, Number(req.params.id));
    if (!it) return res.status(404).json({ message: "Product not found" });
    res.json({
      itemId: it.id,
      ean: it.ean,
      description: it.description,
      caseSize: it.caseSize,
      pricingCategoryId: it.pricingCategoryId,
      price: it.preparedPrice != null ? Number(it.preparedPrice) : null,
      availability: pricingV2.availabilityOf(it.supplierQty),
      availableQty: it.supplierQty,
    });
  });

  // Snapshot priced lines for an order/quote at the customer's current prepared prices.
  // Basket items reference prepared list items by `itemId` (falls back to productId).
  async function buildPricedLines(user: any, items: any[]) {
    const lines: any[] = [];
    let total = 0;
    for (const it of items) {
      const itemId = Number(it.itemId ?? it.productId);
      const li = await pricingV2.getCustomerItem(user.id, itemId);
      if (!li) throw new Error(`Invalid item: ${itemId}`);
      const qty = Math.max(1, Number(it.quantity) || 1);
      const unitPrice = li.preparedPrice != null ? Number(li.preparedPrice) : null;
      const unitCost = li.costPrice != null ? Number(li.costPrice) : null;
      const marginApplied = li.method === "margin" && li.marginPercent != null ? Number(li.marginPercent) : null;
      const lineTotal = unitPrice != null ? unitPrice * qty : 0;
      total += lineTotal;
      lines.push({
        priceListItemId: li.id,
        ean: li.ean,
        description: li.description,
        quantity: qty,
        unitCost,
        unitPrice,
        marginApplied,
        lineTotal,
      });
    }
    return { lines, total };
  }

  // Place an order from the basket (snapshots prices)
  app.post("/api/portal/orders", requireActiveCustomer, async (req: any, res) => {
    try {
      const { items, customerNotes } = req.body;
      if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "Order must have at least one item" });
      const { lines, total } = await buildPricedLines(req.user, items);
      const order = await pricingStore.createOrder({
        userId: req.user.id,
        priceListId: null, // v2: pricing is per-brand across multiple lists
        totalAmount: total,
        customerNotes: customerNotes || null,
        lines,
      });
      const totalFmt = `£${total.toFixed(2)}`;
      const name = req.user.primaryContactName || req.user.companyName || req.user.email;
      await sendOrderSubmissionNotification({ orderId: order.id, customerEmail: req.user.email, customerName: name, companyName: req.user.companyName || name, itemCount: lines.length, totalValue: totalFmt });
      await sendOrderConfirmationToCustomer({ email: req.user.email, contactName: name, orderId: order.id, itemCount: lines.length, totalValue: totalFmt });
      res.status(201).json({ order, message: "Order placed successfully" });
    } catch (error: any) {
      console.error("Order creation error:", error);
      res.status(500).json({ message: error.message || "Failed to place order" });
    }
  });

  app.get("/api/portal/orders", requireActiveCustomer, async (req: any, res) => {
    res.json(await pricingStore.getOrdersByUser(req.user.id));
  });

  app.get("/api/portal/orders/:id", requireActiveCustomer, async (req: any, res) => {
    const found = await pricingStore.getOrderWithItems(Number(req.params.id));
    if (!found) return res.status(404).json({ message: "Order not found" });
    if (found.order.userId !== req.user.id && req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });
    res.json(found);
  });

  // Request a quote / availability from the basket (snapshots prices)
  app.post("/api/portal/quotes", requireActiveCustomer, async (req: any, res) => {
    try {
      const { items, customerNotes } = req.body;
      if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "Quote must have at least one item" });
      const { lines, total } = await buildPricedLines(req.user, items);
      const quote = await storage.createQuote({ userId: req.user.id, status: "pending", customerNotes: customerNotes || null, totalEstimate: total.toFixed(2) });
      for (const l of lines) {
        await storage.createQuoteItem({
          quoteId: quote.id,
          productId: l.productId ?? null,
          priceListItemId: l.priceListItemId ?? null,
          ean: l.ean ?? null,
          description: l.description ?? null,
          quantity: l.quantity,
          unitPrice: l.unitPrice != null ? String(l.unitPrice) : null,
          unitCost: l.unitCost != null ? String(l.unitCost) : null,
          marginApplied: l.marginApplied != null ? String(l.marginApplied) : null,
          lineTotal: l.lineTotal.toFixed(2),
        });
      }
      const totalFmt = `£${total.toFixed(2)}`;
      const name = req.user.primaryContactName || req.user.companyName || req.user.email;
      await sendQuoteSubmissionNotification({ quoteId: quote.id, customerEmail: req.user.email, customerName: name, companyName: req.user.companyName || name, itemCount: lines.length, totalValue: totalFmt });
      await sendQuoteConfirmationToCustomer({ email: req.user.email, contactName: name, quoteId: quote.id, itemCount: lines.length, totalValue: totalFmt });
      res.status(201).json({ quote, message: "Quote request submitted successfully" });
    } catch (error: any) {
      console.error("Portal quote creation error:", error);
      res.status(500).json({ message: error.message || "Failed to create quote" });
    }
  });

  // ===== Price-list downloads (Excel / PDF) =====
  const parseIdList = (v: any): number[] =>
    (typeof v === "string" ? v.split(",") : [])
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n));

  async function sendPriceListDownload(res: any, priceListId: number | null, scope: any, title: string, format: string) {
    const data = await buildPriceListData(priceListId, scope, title);
    const safeTitle = title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    if (format === "pdf") {
      const buf = await buildPriceListPdf(data);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.pdf"`);
      res.send(buf);
    } else {
      const buf = buildPriceListXlsx(data);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.xlsx"`);
      res.send(buf);
    }
  }

  // Customer downloads their own price list, scoped to chosen brands/categories.
  app.get("/api/portal/price-list/download", requireActiveCustomer, async (req: any, res) => {
    try {
      const format = (req.query.format as string) === "pdf" ? "pdf" : "xlsx";
      const scope = { brandIds: parseIdList(req.query.brands), categoryIds: parseIdList(req.query.categories) };
      const title = `Price List — ${req.user.companyName || req.user.email}`;
      const data = await buildCustomerPriceListData(req.user.id, scope, title);
      const safeTitle = title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      if (format === "pdf") {
        const buf = await buildPriceListPdf(data);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.pdf"`);
        res.send(buf);
      } else {
        const buf = buildPriceListXlsx(data);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.xlsx"`);
        res.send(buf);
      }
    } catch (error: any) {
      console.error("Price list download error:", error);
      res.status(500).json({ message: "Failed to generate price list" });
    }
  });

  // Admin generates a list's prices to send manually.
  app.get("/api/admin/price-lists/:id/download", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const format = (req.query.format as string) === "pdf" ? "pdf" : "xlsx";
      const scope = { brandIds: parseIdList(req.query.brands), categoryIds: parseIdList(req.query.categories) };
      const found = await pricingStore.getPriceListWithRules(id);
      const title = `Price List — ${found?.list.name ?? "List " + id}`;
      await sendPriceListDownload(res, id, scope, title, format);
    } catch (error: any) {
      console.error("Admin price list download error:", error);
      res.status(500).json({ message: "Failed to generate price list" });
    }
  });

  // ===== Admin: orders =====
  app.get("/api/admin/orders", requireAdmin, async (req, res) => {
    res.json(await pricingStore.listAllOrders());
  });

  app.get("/api/admin/orders/:id", requireAdmin, async (req, res) => {
    const found = await pricingStore.getOrderWithItems(Number(req.params.id));
    if (!found) return res.status(404).json({ message: "Order not found" });
    res.json(found);
  });

  app.post("/api/admin/orders/:id/respond", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status, adminResponse, adminNotes, sendEmail } = req.body;
      const order = await pricingStore.respondToOrder(id, { status, adminResponse, adminNotes });
      if (sendEmail && adminResponse) {
        const customer = await storage.getUser(order.userId);
        if (customer) await sendCustomerResponseEmail({ email: customer.email, contactName: customer.primaryContactName || customer.companyName || customer.email, kind: "order", refId: id, status: order.status, message: adminResponse });
      }
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to respond" });
    }
  });

  // ===== Admin: quote response email (status update reuses existing PATCH) =====
  app.post("/api/admin/quotes/:id/respond", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { adminNotes, sendEmail } = req.body;
      const updated = await storage.updateQuote(id, adminNotes !== undefined ? { adminNotes } : {});
      if (sendEmail) {
        const quote = await storage.getQuote(id);
        const customer = quote ? await storage.getUser(quote.userId) : null;
        if (customer) await sendCustomerResponseEmail({ email: customer.email, contactName: customer.primaryContactName || customer.companyName || customer.email, kind: "quote", refId: id, status: quote?.status || "updated", message: adminNotes || "" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to respond" });
    }
  });

  app.get("/api/admin/uploads/categories", requireAdmin, (req, res) => {
    res.json(getImageCategories());
  });

  app.get("/api/admin/uploads", requireAdmin, async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const assets = await storage.getAllMediaAssets(category);
      res.json(assets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch media assets" });
    }
  });

  app.post("/api/admin/uploads", requireAdmin, upload.single("image"), async (req: any, res) => {
    try {
      const objectStorageCheck = new ObjectStorageService();
      if (!objectStorageCheck.isConfigured()) {
        return res.status(503).json({ 
          message: "Image upload is not available. Object Storage needs to be configured in the Replit tools panel." 
        });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const category = req.body.category || "general";
      const altText = req.body.altText || "";

      if (!isValidImageCategory(category)) {
        return res.status(400).json({ message: `Invalid category. Allowed: ${getImageCategories().join(", ")}` });
      }

      const validation = validateImageFile(req.file.mimetype, req.file.size);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }

      const processed = await processImage(
        req.file.buffer,
        req.file.originalname,
        category
      );

      const asset = await storage.createMediaAsset({
        filename: processed.filename,
        originalFilename: req.file.originalname,
        mimeType: processed.mimeType,
        fileSize: processed.fileSize,
        width: processed.width,
        height: processed.height,
        category,
        url: processed.url,
        thumbnailUrl: processed.thumbnailUrl || null,
        altText: altText || null,
        uploadedBy: req.user?.id || null,
      });

      res.status(201).json(asset);
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ message: `Failed to upload image: ${error.message}` });
    }
  });

  app.delete("/api/admin/uploads/:id", requireAdmin, async (req, res) => {
    try {
      const asset = await storage.getMediaAsset(Number(req.params.id));
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      await deleteImageFile(asset.url);
      if (asset.thumbnailUrl) {
        await deleteImageFile(asset.thumbnailUrl);
      }

      await storage.deleteMediaAsset(asset.id);
      res.json({ message: "Asset deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete asset" });
    }
  });

  // ==================== AI CHAT ENDPOINTS ====================
  app.post("/api/chat/session", chatSessionLimiter, async (req, res) => {
    try {
      const { visitorName, visitorEmail, visitorCompany } = req.body || {};
      const visitorIp = getVisitorIp(req);
      const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const session = await storage.createChatSession({ 
        sessionId, 
        status: "active",
        visitorName: visitorName || null,
        visitorEmail: visitorEmail || null,
        visitorCompany: visitorCompany || null,
        leadCaptured: !!(visitorName && visitorEmail),
      });
      
      if (visitorName && visitorEmail) {
        // Check for duplicate email within 24 hours
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const existingLead = await storage.getChatLeadByEmailSince(visitorEmail, since24h);
        if (existingLead) {
          console.log(`[Chat] Duplicate lead suppressed for email ${visitorEmail} (IP: ${visitorIp})`);
        } else {
          await storage.createChatLead({
            sessionId,
            name: visitorName,
            email: visitorEmail,
            company: visitorCompany || null,
            status: "new",
          });

          const { sendChatLeadNotification } = await import("./email");
          sendChatLeadNotification({
            name: visitorName,
            email: visitorEmail,
            company: visitorCompany,
            sessionId,
            visitorIp,
          }).catch(console.error);
        }
      }
      
      res.json({ sessionId: session.sessionId });
    } catch (error) {
      console.error("Create chat session error:", error);
      res.status(500).json({ message: "Failed to create chat session" });
    }
  });

  app.post("/api/chat/message", chatMessageLimiter, async (req, res) => {
    try {
      const { sessionId, message } = req.body;
      const visitorIp = getVisitorIp(req);
      
      if (!sessionId || !message) {
        return res.status(400).json({ message: "Session ID and message are required" });
      }

      if (message.length > 500) {
        return res.status(400).json({ message: "Message is too long. Please keep messages under 500 characters." });
      }

      // Save user message
      await storage.createChatMessage({ sessionId, role: "user", content: message });

      // Get conversation history
      const history = await storage.getChatMessages(sessionId);
      const messages = history.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

      // Generate AI response
      const { generateChatResponse, extractLeadInfo } = await import("./ai-chat");
      const response = await generateChatResponse(messages, sessionId);

      // Save assistant response
      await storage.createChatMessage({ sessionId, role: "assistant", content: response });

      // Update session message count
      await storage.updateChatSession(sessionId, { messageCount: history.length + 2 });

      // Try to extract lead info from the conversation
      const leadInfo = extractLeadInfo(messages);
      if (leadInfo.email || leadInfo.phone) {
        const existingSession = await storage.getChatSession(sessionId);
        if (existingSession && !existingSession.leadCaptured) {
          // Check for duplicate email within 24 hours
          let isDuplicate = false;
          if (leadInfo.email) {
            const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const existingLead = await storage.getChatLeadByEmailSince(leadInfo.email, since24h);
            if (existingLead) {
              isDuplicate = true;
              console.log(`[Chat] Duplicate lead suppressed for email ${leadInfo.email} (IP: ${visitorIp})`);
            }
          }

          if (!isDuplicate) {
            await storage.createChatLead({
              sessionId,
              email: leadInfo.email,
              phone: leadInfo.phone,
              interest: leadInfo.interest,
              status: "new",
            });
          }

          await storage.updateChatSession(sessionId, { 
            leadCaptured: true,
            visitorEmail: leadInfo.email,
            visitorPhone: leadInfo.phone,
          });

          // Send notification email for new lead
          if (!isDuplicate) {
            try {
              const { sendChatLeadNotification } = await import("./email");
              await sendChatLeadNotification({
                email: leadInfo.email,
                phone: leadInfo.phone,
                interest: leadInfo.interest,
                sessionId,
                visitorIp,
              });
            } catch (emailError) {
              console.error("Failed to send lead notification:", emailError);
            }
          }
        }
      }

      res.json({ response });
    } catch (error) {
      console.error("Chat message error:", error);
      res.status(500).json({ message: "Failed to process message", response: "I apologize, I'm having trouble right now. Please contact us at trade@pharmaoasis.com." });
    }
  });

  app.get("/api/chat/history/:sessionId", async (req, res) => {
    try {
      const messages = await storage.getChatMessages(req.params.sessionId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  app.post("/api/chat/lead", chatMessageLimiter, async (req, res) => {
    try {
      const { sessionId, name, email, phone, company, interest } = req.body;
      const visitorIp = getVisitorIp(req);

      // Check for duplicate email within 24 hours
      if (email) {
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const existingLead = await storage.getChatLeadByEmailSince(email, since24h);
        if (existingLead) {
          console.log(`[Chat] Duplicate lead suppressed for email ${email} (IP: ${visitorIp})`);
          return res.json({ success: true, duplicate: true });
        }
      }

      const lead = await storage.createChatLead({
        sessionId,
        name,
        email,
        phone,
        company,
        interest,
        status: "new",
      });

      // Update session with lead info
      await storage.updateChatSession(sessionId, {
        leadCaptured: true,
        visitorName: name,
        visitorEmail: email,
        visitorPhone: phone,
        visitorCompany: company,
      });

      // Send notification email
      try {
        const { sendChatLeadNotification } = await import("./email");
        await sendChatLeadNotification({ name, email, phone, company, interest, sessionId, visitorIp });
      } catch (emailError) {
        console.error("Failed to send lead notification:", emailError);
      }

      res.json({ success: true, lead });
    } catch (error) {
      console.error("Create lead error:", error);
      res.status(500).json({ message: "Failed to save lead information" });
    }
  });

  // Admin chat routes
  app.get("/api/admin/chat/sessions", requireAdmin, async (req, res) => {
    try {
      const sessions = await storage.getAllChatSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat sessions" });
    }
  });

  app.get("/api/admin/chat/leads", requireAdmin, async (req, res) => {
    try {
      const leads = await storage.getAllChatLeads();
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat leads" });
    }
  });

  app.get("/api/admin/chat/leads/count/new", requireAdmin, async (req, res) => {
    try {
      const leads = await storage.getAllChatLeads();
      const newCount = leads.filter(l => l.status === "new").length;
      res.json({ count: newCount });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leads count" });
    }
  });

  app.patch("/api/admin/chat/leads/:id", requireAdmin, async (req, res) => {
    try {
      const lead = await storage.updateChatLead(Number(req.params.id), req.body);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.get("/api/admin/chat/messages/:sessionId", requireAdmin, async (req, res) => {
    try {
      const messages = await storage.getChatMessages(req.params.sessionId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.get("/api/admin/chat/session/:sessionId", requireAdmin, async (req, res) => {
    try {
      const session = await storage.getChatSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  // ==================== UPLOAD JOBS (Background Processing) ====================
  
  // List all upload jobs with filtering
  app.get("/api/admin/upload-jobs", requireAdmin, async (req, res) => {
    try {
      const jobType = req.query.jobType as string | undefined;
      const jobs = await db.select()
        .from(uploadJobs)
        .orderBy(desc(uploadJobs.queuedAt))
        .limit(50);
      
      const filteredJobs = jobType 
        ? jobs.filter(j => j.jobType === jobType)
        : jobs;
      
      res.json(filteredJobs);
    } catch (error) {
      console.error("Failed to fetch upload jobs:", error);
      res.status(500).json({ message: "Failed to fetch upload jobs" });
    }
  });

  // Get single upload job status
  app.get("/api/admin/upload-jobs/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const [job] = await db.select().from(uploadJobs).where(eq(uploadJobs.id, id));
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      res.json(job);
    } catch (error) {
      console.error("Failed to fetch upload job:", error);
      res.status(500).json({ message: "Failed to fetch upload job" });
    }
  });

  // Queue a Google price import job
  app.post("/api/admin/google-pricing/upload", requireAdmin, async (req, res) => {
    try {
      const { rows, fileName } = req.body;
      
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "No data to import" });
      }

      const userId = req.session.userId!;
      
      const [job] = await db.insert(uploadJobs).values({
        jobType: "google_price_import",
        fileName: fileName || "google_pricing.csv",
        uploadedByUserId: userId,
        status: "pending",
        totalRows: rows.length,
        errorDetails: JSON.stringify(rows),
      }).returning();

      const { queueUploadJob } = await import("./upload-processor");
      queueUploadJob(job.id);

      res.json({ 
        message: "Upload queued for processing",
        jobId: job.id,
        totalRows: rows.length
      });
    } catch (error) {
      console.error("Failed to queue upload:", error);
      res.status(500).json({ message: "Failed to queue upload" });
    }
  });

  // Queue a product import job
  app.post("/api/admin/products/import-async", requireStaffOrAdmin, async (req, res) => {
    try {
      const { products: productData, fileName } = req.body;
      
      if (!Array.isArray(productData) || productData.length === 0) {
        return res.status(400).json({ message: "No products to import" });
      }

      const userId = req.session.userId!;
      
      const [job] = await db.insert(uploadJobs).values({
        jobType: "product_import",
        fileName: fileName || "products.csv",
        uploadedByUserId: userId,
        status: "pending",
        totalRows: productData.length,
        errorDetails: JSON.stringify(productData),
      }).returning();

      const { queueUploadJob } = await import("./upload-processor");
      queueUploadJob(job.id);

      res.json({ 
        message: "Import queued for processing",
        jobId: job.id,
        totalRows: productData.length
      });
    } catch (error) {
      console.error("Failed to queue product import:", error);
      res.status(500).json({ message: "Failed to queue import" });
    }
  });

  // Download errors for a specific job
  app.get("/api/admin/upload-jobs/:id/errors", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const [job] = await db.select().from(uploadJobs).where(eq(uploadJobs.id, id));
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (!job.errorDetails) {
        return res.status(404).json({ message: "No errors found for this job" });
      }

      const errors = JSON.parse(job.errorDetails);
      
      let csv = "row,sku,error\n";
      for (const err of errors) {
        csv += `${err.row},"${err.sku || ""}","${(err.error || "").replace(/"/g, '""')}"\n`;
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="job_${id}_errors.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Failed to download errors:", error);
      res.status(500).json({ message: "Failed to download errors" });
    }
  });

  // ==================== ADMIN SEED ENDPOINT ====================
  // Always requires an authenticated admin. (Fresh databases are seeded automatically at
  // startup — see app.ts — so there is no open "first-time" bypass to abuse.)
  app.post("/api/admin/seed", requireAdmin, async (req, res) => {
    try {
      const { seed } = await import("./seed");
      await seed();
      res.json({ success: true, message: "Database seeded successfully! Refresh your browser to see the changes." });
    } catch (error: any) {
      console.error("Seed error:", error);
      res.status(500).json({ success: false, message: `Seed failed: ${error.message}` });
    }
  });

  migrateProductSlugs().catch(err => console.error("Slug migration error:", err));
}

async function migrateProductSlugs() {
  try {
    const { products } = await import("@shared/schema");
    const { isNull, or, sql: sqlExpr } = await import("drizzle-orm");

    const productsNeedingSlugs = await db
      .select({ id: products.id, productName: products.productName, slug: products.slug })
      .from(products)
      .where(or(isNull(products.slug), sqlExpr`${products.slug} ~ '^[0-9]+$'`));

    if (productsNeedingSlugs.length === 0) {
      console.log("[Slug Migration] All products have proper slugs");
      return;
    }

    console.log(`[Slug Migration] Generating slugs for ${productsNeedingSlugs.length} products...`);

    const existingSlugs = new Set<string>();
    const allProducts = await db.select({ slug: products.slug }).from(products);
    allProducts.forEach(p => { if (p.slug) existingSlugs.add(p.slug); });

    let updated = 0;
    for (const product of productsNeedingSlugs) {
      let baseSlug = product.productName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .substring(0, 100);

      let slug = baseSlug;
      let counter = 2;
      while (existingSlugs.has(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      existingSlugs.add(slug);
      const { eq } = await import("drizzle-orm");
      await db.update(products).set({ slug }).where(eq(products.id, product.id));
      updated++;
    }

    console.log(`[Slug Migration] Updated ${updated} product slugs`);
  } catch (error) {
    console.error("[Slug Migration] Error:", error);
  }
}
