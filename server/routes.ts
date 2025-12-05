import type { Express } from "express";
import type { Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { 
  loginSchema, 
  customerRegistrationSchema, 
  supplierRegistrationSchema,
  contactFormSchema,
  insertProductSchema,
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export async function registerRoutes(server: Server, app: Express): Promise<void> {
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "pharma-oasis-dev-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
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

      req.session.userId = user.id;
      const { passwordHash, ...safeUser } = user;
      res.json({ user: safeUser });
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

      console.log(`[EMAIL] New customer registration: ${data.email} - ${data.companyName}`);
      
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

      console.log(`[EMAIL] New supplier lead: ${data.email} - ${data.companyName}`);
      
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

      console.log(`[EMAIL] New contact message from: ${data.email}`);
      
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

      console.log(`[EMAIL] New quote request #${quote.id} from ${req.user.companyName}`);

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
        console.log(`[EMAIL] Account approved: ${user.email}`);
      } else if (status === "rejected") {
        console.log(`[EMAIL] Account rejected: ${user.email}`);
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

  app.patch("/api/admin/quotes/:id", requireAdmin, async (req, res) => {
    try {
      const quote = await storage.updateQuote(Number(req.params.id), req.body);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      res.status(500).json({ message: "Failed to update quote" });
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
      const message = await storage.updateContactMessage(Number(req.params.id), { isRead: true });
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
}
