import { 
  users, brands, categories, products, quotes, quoteItems, 
  supplierLeads, cmsBlocks, siteSettings, contactMessages, heroSlides,
  type User, type InsertUser,
  type Brand, type InsertBrand,
  type Category, type InsertCategory,
  type Product, type InsertProduct,
  type Quote, type InsertQuote,
  type QuoteItem, type InsertQuoteItem,
  type SupplierLead, type InsertSupplierLead,
  type CmsBlock, type InsertCmsBlock,
  type SiteSetting, type InsertSiteSetting,
  type ContactMessage, type InsertContactMessage,
  type HeroSlide, type InsertHeroSlide,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, ilike, desc, asc, sql, isNull, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersByStatus(status: string): Promise<User[]>;

  // Brands
  getBrand(id: number): Promise<Brand | undefined>;
  getBrandByName(name: string): Promise<Brand | undefined>;
  createBrand(brand: InsertBrand): Promise<Brand>;
  updateBrand(id: number, updates: Partial<InsertBrand>): Promise<Brand | undefined>;
  deleteBrand(id: number): Promise<void>;
  getAllBrands(activeOnly?: boolean): Promise<Brand[]>;

  // Categories
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryByName(name: string, parentId?: number | null): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<void>;
  getAllCategories(activeOnly?: boolean): Promise<Category[]>;
  getTopLevelCategories(activeOnly?: boolean): Promise<Category[]>;
  getSubcategories(parentId: number, activeOnly?: boolean): Promise<Category[]>;

  // Products
  getProduct(id: number): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;
  getAllProducts(options?: { activeOnly?: boolean; featuredOnly?: boolean; limit?: number; offset?: number }): Promise<Product[]>;
  getProductsByCategory(categoryId: number, activeOnly?: boolean): Promise<Product[]>;
  getProductsByBrand(brandId: number, activeOnly?: boolean): Promise<Product[]>;
  searchProducts(query: string, activeOnly?: boolean): Promise<Product[]>;
  getProductCount(activeOnly?: boolean): Promise<number>;
  bulkCreateProducts(products: InsertProduct[]): Promise<Product[]>;

  // Quotes
  getQuote(id: number): Promise<Quote | undefined>;
  getQuoteWithItems(id: number): Promise<(Quote & { items: (QuoteItem & { product: Product })[] }) | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: number, updates: Partial<InsertQuote>): Promise<Quote | undefined>;
  getQuotesByUser(userId: number): Promise<Quote[]>;
  getAllQuotes(): Promise<Quote[]>;
  getQuotesByStatus(status: string): Promise<Quote[]>;
  getQuoteVersionHistory(quoteId: number): Promise<Quote[]>;
  createQuoteVersion(quoteId: number): Promise<Quote>;

  // Quote Items
  createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem>;
  getQuoteItems(quoteId: number): Promise<(QuoteItem & { product: Product })[]>;
  deleteQuoteItems(quoteId: number): Promise<void>;

  // Supplier Leads
  createSupplierLead(lead: InsertSupplierLead): Promise<SupplierLead>;
  getSupplierLead(id: number): Promise<SupplierLead | undefined>;
  updateSupplierLead(id: number, updates: Partial<InsertSupplierLead>): Promise<SupplierLead | undefined>;
  getAllSupplierLeads(): Promise<SupplierLead[]>;
  getSupplierLeadsByStatus(status: string): Promise<SupplierLead[]>;

  // CMS Blocks
  getCmsBlock(key: string): Promise<CmsBlock | undefined>;
  getCmsBlocksBySection(section: string): Promise<CmsBlock[]>;
  createCmsBlock(block: InsertCmsBlock): Promise<CmsBlock>;
  updateCmsBlock(key: string, updates: Partial<InsertCmsBlock>): Promise<CmsBlock | undefined>;
  deleteCmsBlock(key: string): Promise<void>;
  getAllCmsBlocks(): Promise<CmsBlock[]>;

  // Site Settings
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string, description?: string): Promise<SiteSetting>;
  getAllSettings(): Promise<SiteSetting[]>;

  // Contact Messages
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  getContactMessage(id: number): Promise<ContactMessage | undefined>;
  updateContactMessage(id: number, updates: Partial<InsertContactMessage>): Promise<ContactMessage | undefined>;
  getAllContactMessages(): Promise<ContactMessage[]>;
  getContactMessagesByStatus(status: string): Promise<ContactMessage[]>;

  // Hero Slides
  getHeroSlide(id: number): Promise<HeroSlide | undefined>;
  createHeroSlide(slide: InsertHeroSlide): Promise<HeroSlide>;
  updateHeroSlide(id: number, updates: Partial<InsertHeroSlide>): Promise<HeroSlide | undefined>;
  deleteHeroSlide(id: number): Promise<void>;
  getAllHeroSlides(): Promise<HeroSlide[]>;
  getActiveHeroSlides(): Promise<HeroSlide[]>;
  reorderHeroSlides(orderedIds: number[]): Promise<void>;

  // Featured Brands (for homepage)
  getFeaturedBrands(): Promise<Brand[]>;
  updateBrandHomeFeatured(id: number, isHomeFeatured: boolean, homePosition?: number): Promise<Brand | undefined>;
}

export class DatabaseStorage implements IStorage {
  // ==================== USERS ====================
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values({
      ...user,
      email: user.email.toLowerCase(),
    }).returning();
    return created;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUsersByStatus(status: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.status, status)).orderBy(desc(users.createdAt));
  }

  // ==================== BRANDS ====================
  async getBrand(id: number): Promise<Brand | undefined> {
    const [brand] = await db.select().from(brands).where(eq(brands.id, id));
    return brand;
  }

  async getBrandByName(name: string): Promise<Brand | undefined> {
    const [brand] = await db.select().from(brands).where(ilike(brands.name, name));
    return brand;
  }

  async createBrand(brand: InsertBrand): Promise<Brand> {
    const [created] = await db.insert(brands).values(brand).returning();
    return created;
  }

  async updateBrand(id: number, updates: Partial<InsertBrand>): Promise<Brand | undefined> {
    const [updated] = await db.update(brands)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(brands.id, id))
      .returning();
    return updated;
  }

  async deleteBrand(id: number): Promise<void> {
    await db.delete(brands).where(eq(brands.id, id));
  }

  async getAllBrands(activeOnly = false): Promise<Brand[]> {
    if (activeOnly) {
      return db.select().from(brands).where(eq(brands.isActive, true)).orderBy(asc(brands.name));
    }
    return db.select().from(brands).orderBy(asc(brands.name));
  }

  // ==================== CATEGORIES ====================
  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async getCategoryByName(name: string, parentId?: number | null): Promise<Category | undefined> {
    if (parentId === undefined) {
      const [category] = await db.select().from(categories).where(ilike(categories.name, name));
      return category;
    }
    const [category] = await db.select().from(categories).where(
      and(
        ilike(categories.name, name),
        parentId === null ? isNull(categories.parentId) : eq(categories.parentId, parentId)
      )
    );
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [created] = await db.insert(categories).values(category).returning();
    return created;
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db.update(categories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return updated;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getAllCategories(activeOnly = false): Promise<Category[]> {
    if (activeOnly) {
      return db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.name));
    }
    return db.select().from(categories).orderBy(asc(categories.name));
  }

  async getTopLevelCategories(activeOnly = false): Promise<Category[]> {
    const conditions = [isNull(categories.parentId)];
    if (activeOnly) conditions.push(eq(categories.isActive, true));
    return db.select().from(categories).where(and(...conditions)).orderBy(asc(categories.name));
  }

  async getSubcategories(parentId: number, activeOnly = false): Promise<Category[]> {
    const conditions = [eq(categories.parentId, parentId)];
    if (activeOnly) conditions.push(eq(categories.isActive, true));
    return db.select().from(categories).where(and(...conditions)).orderBy(asc(categories.name));
  }

  // ==================== PRODUCTS ====================
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.sku, sku));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getAllProducts(options: { activeOnly?: boolean; featuredOnly?: boolean; limit?: number; offset?: number } = {}): Promise<Product[]> {
    const { activeOnly = false, featuredOnly = false, limit, offset } = options;
    const conditions = [];
    if (activeOnly) conditions.push(eq(products.isActive, true));
    if (featuredOnly) conditions.push(eq(products.isFeatured, true));

    let query = db.select().from(products);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    query = query.orderBy(desc(products.createdAt)) as typeof query;
    if (limit) query = query.limit(limit) as typeof query;
    if (offset) query = query.offset(offset) as typeof query;

    return query;
  }

  async getProductsByCategory(categoryId: number, activeOnly = false): Promise<Product[]> {
    const conditions = [
      or(eq(products.categoryId, categoryId), eq(products.subcategoryId, categoryId))
    ];
    if (activeOnly) conditions.push(eq(products.isActive, true));
    return db.select().from(products).where(and(...conditions)).orderBy(asc(products.productName));
  }

  async getProductsByBrand(brandId: number, activeOnly = false): Promise<Product[]> {
    const conditions = [eq(products.brandId, brandId)];
    if (activeOnly) conditions.push(eq(products.isActive, true));
    return db.select().from(products).where(and(...conditions)).orderBy(asc(products.productName));
  }

  async searchProducts(query: string, activeOnly = false): Promise<Product[]> {
    const searchTerm = `%${query}%`;
    const conditions = [
      or(
        ilike(products.productName, searchTerm),
        ilike(products.sku, searchTerm),
        ilike(products.shortDescription, searchTerm)
      )
    ];
    if (activeOnly) conditions.push(eq(products.isActive, true));
    return db.select().from(products).where(and(...conditions)).orderBy(asc(products.productName)).limit(50);
  }

  async getProductCount(activeOnly = false): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(products)
      .where(activeOnly ? eq(products.isActive, true) : undefined);
    return Number(result[0]?.count ?? 0);
  }

  async bulkCreateProducts(productList: InsertProduct[]): Promise<Product[]> {
    if (productList.length === 0) return [];
    return db.insert(products).values(productList).returning();
  }

  // ==================== QUOTES ====================
  async getQuote(id: number): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote;
  }

  async getQuoteWithItems(id: number): Promise<(Quote & { items: (QuoteItem & { product: Product })[] }) | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    if (!quote) return undefined;

    const items = await this.getQuoteItems(id);
    return { ...quote, items };
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const [created] = await db.insert(quotes).values(quote).returning();
    return created;
  }

  async updateQuote(id: number, updates: Partial<InsertQuote>): Promise<Quote | undefined> {
    const [updated] = await db.update(quotes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(quotes.id, id))
      .returning();
    return updated;
  }

  async getQuotesByUser(userId: number): Promise<Quote[]> {
    return db.select().from(quotes).where(eq(quotes.userId, userId)).orderBy(desc(quotes.createdAt));
  }

  async getAllQuotes(): Promise<Quote[]> {
    return db.select().from(quotes).orderBy(desc(quotes.createdAt));
  }

  async getQuotesByStatus(status: string): Promise<Quote[]> {
    return db.select().from(quotes).where(eq(quotes.status, status)).orderBy(desc(quotes.createdAt));
  }

  async getQuoteVersionHistory(quoteId: number): Promise<Quote[]> {
    const quote = await this.getQuote(quoteId);
    if (!quote) return [];
    
    const rootQuoteId = quote.parentQuoteId ?? quote.id;
    
    const allVersions = await db.select().from(quotes)
      .where(or(eq(quotes.id, rootQuoteId), eq(quotes.parentQuoteId, rootQuoteId)))
      .orderBy(asc(quotes.version));
    
    return allVersions;
  }

  async createQuoteVersion(quoteId: number): Promise<Quote> {
    return await db.transaction(async (tx) => {
      const [originalQuote] = await tx.select().from(quotes).where(eq(quotes.id, quoteId));
      if (!originalQuote) {
        throw new Error("Quote not found");
      }
      
      const originalItems = await tx.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
      
      const rootQuoteId = originalQuote.parentQuoteId ?? originalQuote.id;
      
      const existingVersions = await tx.select({ version: quotes.version }).from(quotes)
        .where(or(eq(quotes.id, rootQuoteId), eq(quotes.parentQuoteId, rootQuoteId)));
      
      const maxVersion = Math.max(...existingVersions.map(q => q.version || 1), 0);
      const newVersion = maxVersion + 1;
      
      const [newQuote] = await tx.insert(quotes).values({
        userId: originalQuote.userId,
        status: "pending",
        customerNotes: originalQuote.customerNotes,
        adminNotes: null,
        totalEstimate: originalQuote.totalEstimate,
        expiryDate: null,
        version: newVersion,
        parentQuoteId: rootQuoteId,
      }).returning();
      
      if (originalItems.length > 0) {
        await tx.insert(quoteItems).values(
          originalItems.map(item => ({
            quoteId: newQuote.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          }))
        );
      }
      
      return newQuote;
    });
  }

  // ==================== QUOTE ITEMS ====================
  async createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem> {
    const [created] = await db.insert(quoteItems).values(item).returning();
    return created;
  }

  async getQuoteItems(quoteId: number): Promise<(QuoteItem & { product: Product })[]> {
    const items = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
    const productIds = items.map(item => item.productId);
    
    if (productIds.length === 0) return [];
    
    const productList = await db.select().from(products).where(inArray(products.id, productIds));
    const productMap = new Map(productList.map(p => [p.id, p]));
    
    return items.map(item => ({
      ...item,
      product: productMap.get(item.productId)!,
    }));
  }

  async deleteQuoteItems(quoteId: number): Promise<void> {
    await db.delete(quoteItems).where(eq(quoteItems.quoteId, quoteId));
  }

  // ==================== SUPPLIER LEADS ====================
  async createSupplierLead(lead: InsertSupplierLead): Promise<SupplierLead> {
    const [created] = await db.insert(supplierLeads).values(lead).returning();
    return created;
  }

  async getSupplierLead(id: number): Promise<SupplierLead | undefined> {
    const [lead] = await db.select().from(supplierLeads).where(eq(supplierLeads.id, id));
    return lead;
  }

  async updateSupplierLead(id: number, updates: Partial<InsertSupplierLead>): Promise<SupplierLead | undefined> {
    const [updated] = await db.update(supplierLeads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(supplierLeads.id, id))
      .returning();
    return updated;
  }

  async getAllSupplierLeads(): Promise<SupplierLead[]> {
    return db.select().from(supplierLeads).orderBy(desc(supplierLeads.createdAt));
  }

  async getSupplierLeadsByStatus(status: string): Promise<SupplierLead[]> {
    return db.select().from(supplierLeads).where(eq(supplierLeads.status, status)).orderBy(desc(supplierLeads.createdAt));
  }

  // ==================== CMS BLOCKS ====================
  async getCmsBlock(key: string): Promise<CmsBlock | undefined> {
    const [block] = await db.select().from(cmsBlocks).where(eq(cmsBlocks.key, key));
    return block;
  }

  async getCmsBlocksBySection(section: string): Promise<CmsBlock[]> {
    return db.select().from(cmsBlocks).where(eq(cmsBlocks.section, section));
  }

  async createCmsBlock(block: InsertCmsBlock): Promise<CmsBlock> {
    const [created] = await db.insert(cmsBlocks).values(block).returning();
    return created;
  }

  async updateCmsBlock(key: string, updates: Partial<InsertCmsBlock>): Promise<CmsBlock | undefined> {
    const [updated] = await db.update(cmsBlocks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cmsBlocks.key, key))
      .returning();
    return updated;
  }

  async deleteCmsBlock(key: string): Promise<void> {
    await db.delete(cmsBlocks).where(eq(cmsBlocks.key, key));
  }

  async getAllCmsBlocks(): Promise<CmsBlock[]> {
    return db.select().from(cmsBlocks).orderBy(asc(cmsBlocks.section), asc(cmsBlocks.key));
  }

  // ==================== SITE SETTINGS ====================
  async getSetting(key: string): Promise<string | undefined> {
    const [setting] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return setting?.value;
  }

  async setSetting(key: string, value: string, description?: string): Promise<SiteSetting> {
    const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    
    if (existing.length > 0) {
      const [updated] = await db.update(siteSettings)
        .set({ value, description, updatedAt: new Date() })
        .where(eq(siteSettings.key, key))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(siteSettings)
      .values({ key, value, description })
      .returning();
    return created;
  }

  async getAllSettings(): Promise<SiteSetting[]> {
    return db.select().from(siteSettings).orderBy(asc(siteSettings.key));
  }

  // ==================== CONTACT MESSAGES ====================
  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [created] = await db.insert(contactMessages).values(message).returning();
    return created;
  }

  async getContactMessage(id: number): Promise<ContactMessage | undefined> {
    const [message] = await db.select().from(contactMessages).where(eq(contactMessages.id, id));
    return message;
  }

  async updateContactMessage(id: number, updates: Partial<InsertContactMessage>): Promise<ContactMessage | undefined> {
    const [updated] = await db.update(contactMessages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contactMessages.id, id))
      .returning();
    return updated;
  }

  async getAllContactMessages(): Promise<ContactMessage[]> {
    return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  }

  async getContactMessagesByStatus(status: string): Promise<ContactMessage[]> {
    return db.select().from(contactMessages).where(eq(contactMessages.status, status)).orderBy(desc(contactMessages.createdAt));
  }

  async deleteContactMessage(id: number): Promise<void> {
    await db.delete(contactMessages).where(eq(contactMessages.id, id));
  }

  // Missing methods for admin panel
  async deleteSupplierLead(id: number): Promise<void> {
    await db.delete(supplierLeads).where(eq(supplierLeads.id, id));
  }

  async updateCmsBlockById(id: number, updates: Partial<InsertCmsBlock>): Promise<CmsBlock | undefined> {
    const [updated] = await db.update(cmsBlocks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cmsBlocks.id, id))
      .returning();
    return updated;
  }

  async deleteCmsBlockById(id: number): Promise<void> {
    await db.delete(cmsBlocks).where(eq(cmsBlocks.id, id));
  }

  async getSiteSettings(): Promise<Record<string, string>> {
    const settings = await db.select().from(siteSettings);
    const result: Record<string, string> = {};
    settings.forEach(s => {
      result[s.key] = s.value;
    });
    return result;
  }

  async updateSiteSettings(updates: Record<string, string>): Promise<Record<string, string>> {
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        await this.setSetting(key, String(value));
      }
    }
    return this.getSiteSettings();
  }

  // ==================== HERO SLIDES ====================
  async getHeroSlide(id: number): Promise<HeroSlide | undefined> {
    const [slide] = await db.select().from(heroSlides).where(eq(heroSlides.id, id));
    return slide;
  }

  async createHeroSlide(slide: InsertHeroSlide): Promise<HeroSlide> {
    const maxPosition = await db.select({ max: sql<number>`COALESCE(MAX(position), 0)` })
      .from(heroSlides);
    const position = (maxPosition[0]?.max ?? 0) + 1;
    
    const [created] = await db.insert(heroSlides).values({
      ...slide,
      position: slide.position ?? position,
    }).returning();
    return created;
  }

  async updateHeroSlide(id: number, updates: Partial<InsertHeroSlide>): Promise<HeroSlide | undefined> {
    const [updated] = await db.update(heroSlides)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(heroSlides.id, id))
      .returning();
    return updated;
  }

  async deleteHeroSlide(id: number): Promise<void> {
    await db.delete(heroSlides).where(eq(heroSlides.id, id));
  }

  async getAllHeroSlides(): Promise<HeroSlide[]> {
    return db.select().from(heroSlides).orderBy(asc(heroSlides.position));
  }

  async getActiveHeroSlides(): Promise<HeroSlide[]> {
    return db.select().from(heroSlides)
      .where(eq(heroSlides.isActive, true))
      .orderBy(asc(heroSlides.position));
  }

  async reorderHeroSlides(orderedIds: number[]): Promise<void> {
    await db.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.update(heroSlides)
          .set({ position: i, updatedAt: new Date() })
          .where(eq(heroSlides.id, orderedIds[i]));
      }
    });
  }

  // ==================== FEATURED BRANDS ====================
  async getFeaturedBrands(): Promise<Brand[]> {
    return db.select().from(brands)
      .where(and(
        eq(brands.isActive, true),
        eq(brands.isHomeFeatured, true)
      ))
      .orderBy(asc(brands.homePosition), asc(brands.name));
  }

  async updateBrandHomeFeatured(id: number, isHomeFeatured: boolean, homePosition?: number): Promise<Brand | undefined> {
    const [updated] = await db.update(brands)
      .set({ 
        isHomeFeatured, 
        homePosition: homePosition ?? null,
        updatedAt: new Date() 
      })
      .where(eq(brands.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
