import type { Express } from "express";
import type { Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { storage } from "./storage";
import { pool } from "./db";
import { 
  loginSchema, 
  customerRegistrationSchema, 
  supplierRegistrationSchema,
  contactFormSchema,
  insertProductSchema,
  profileUpdateSchema,
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  sendCustomerRegistrationNotification,
  sendSupplierRegistrationNotification,
  sendContactFormNotification,
  sendQuoteSubmissionNotification,
  sendQuoteConfirmationToCustomer,
  sendAccountApprovalEmail,
  sendAccountRejectionEmail,
} from "./email";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export async function registerRoutes(server: Server, app: Express): Promise<void> {
  // Trust proxy for production (required behind reverse proxies like Replit)
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // Create PostgreSQL session store for persistent sessions
  const PgSession = connectPgSimple(session);
  const sessionStore = new PgSession({
    pool: pool,
    tableName: "session",
    createTableIfMissing: true,
  });

  // Session middleware with PostgreSQL store
  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "pharma-oasis-dev-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax", // Allow navigation to keep session
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

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

  // ==================== AUTH ROUTES ====================
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    const { passwordHash, ...safeUser } = user;
    res.json({ user: safeUser });
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

      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        req.session.userId = user.id;
        const { passwordHash, ...safeUser } = user;
        res.json({ user: safeUser });
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

      const { passwordHash, ...safeUser } = user;
      res.json({ user: safeUser });
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
      const { category, brand, search, featured, limit, offset } = req.query;
      
      let productList;
      
      if (search && typeof search === "string") {
        productList = await storage.searchProducts(search, true);
      } else if (category) {
        productList = await storage.getProductsByCategory(Number(category), true);
      } else if (brand) {
        productList = await storage.getProductsByBrand(Number(brand), true);
      } else {
        productList = await storage.getAllProducts({
          activeOnly: true,
          featuredOnly: featured === "true",
          limit: limit ? Number(limit) : undefined,
          offset: offset ? Number(offset) : undefined,
        });
      }
      
      res.json(productList);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // ==================== PUBLIC BRAND & CATEGORY ROUTES ====================
  app.get("/api/brands", async (req, res) => {
    try {
      const brandList = await storage.getAllBrands(true);
      res.json(brandList);
    } catch (error) {
      console.error("Error fetching brands:", error);
      res.status(500).json({ message: "Failed to fetch brands" });
    }
  });

  app.get("/api/categories", async (req, res) => {
    try {
      const categoryList = await storage.getAllCategories(true);
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

  // ==================== ADMIN ROUTES ====================
  
  // Admin - Users
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const userList = await storage.getAllUsers();
      res.json(userList.map(u => {
        const { passwordHash, ...safe } = u;
        return safe;
      }));
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

      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Admin - Products
  app.post("/api/admin/products", requireAdmin, async (req, res) => {
    try {
      const data = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(data);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      const product = await storage.updateProduct(Number(req.params.id), req.body);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteProduct(Number(req.params.id));
      res.json({ message: "Product deleted" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Admin - CSV Import
  app.post("/api/admin/products/import", requireAdmin, async (req, res) => {
    try {
      const { products: productData } = req.body;
      
      if (!Array.isArray(productData) || productData.length === 0) {
        return res.status(400).json({ message: "No products to import" });
      }

      const results = { created: 0, updated: 0, errors: [] as string[] };

      for (const row of productData) {
        try {
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
            uom: row.uom || null,
            rrp: row.rrp || null,
            wholesalePrice: row.wholesalePrice,
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
          results.errors.push(`Row ${row.sku}: ${err.message}`);
        }
      }

      res.json(results);
    } catch (error) {
      console.error("CSV import error:", error);
      res.status(500).json({ message: "Import failed" });
    }
  });

  // Admin - Brands
  app.get("/api/admin/brands", requireAdmin, async (req, res) => {
    try {
      const brandList = await storage.getAllBrands();
      res.json(brandList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch brands" });
    }
  });

  app.post("/api/admin/brands", requireAdmin, async (req, res) => {
    try {
      const brand = await storage.createBrand(req.body);
      res.status(201).json(brand);
    } catch (error) {
      res.status(500).json({ message: "Failed to create brand" });
    }
  });

  app.patch("/api/admin/brands/:id", requireAdmin, async (req, res) => {
    try {
      const brand = await storage.updateBrand(Number(req.params.id), req.body);
      res.json(brand);
    } catch (error) {
      res.status(500).json({ message: "Failed to update brand" });
    }
  });

  app.delete("/api/admin/brands/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteBrand(Number(req.params.id));
      res.json({ message: "Brand deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete brand" });
    }
  });

  // Admin - Categories
  app.get("/api/admin/categories", requireAdmin, async (req, res) => {
    try {
      const categoryList = await storage.getAllCategories();
      res.json(categoryList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/admin/categories", requireAdmin, async (req, res) => {
    try {
      const category = await storage.createCategory(req.body);
      res.status(201).json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.patch("/api/admin/categories/:id", requireAdmin, async (req, res) => {
    try {
      const category = await storage.updateCategory(Number(req.params.id), req.body);
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/admin/categories/:id", requireAdmin, async (req, res) => {
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
      const settings = await storage.updateSiteSettings(req.body);
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

  // ==================== ADMIN SEED ENDPOINT (for production first-time setup) ====================
  // This endpoint requires admin login OR works if no admin exists (first-time setup)
  app.post("/api/admin/seed", async (req, res) => {
    try {
      // Check if admin exists - allow seed if no admin (first-time setup) or if logged in as admin
      const adminCheck = await storage.getUserByEmail("admin@pharmaoasis.com");
      
      if (adminCheck) {
        // Admin exists - require authentication
        if (!req.session.userId) {
          return res.status(401).json({ message: "Authentication required" });
        }
        const user = await storage.getUser(req.session.userId);
        if (!user || user.role !== "admin") {
          return res.status(403).json({ message: "Admin access required" });
        }
      }
      
      const { seed } = await import("./seed");
      await seed();
      res.json({ success: true, message: "Database seeded successfully! Refresh your browser to see the changes." });
    } catch (error: any) {
      console.error("Seed error:", error);
      res.status(500).json({ success: false, message: `Seed failed: ${error.message}` });
    }
  });
}
