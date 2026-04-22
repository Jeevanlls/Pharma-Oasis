import { 
  users, brands, categories, products, quotes, quoteItems, 
  supplierLeads, cmsBlocks, siteSettings, contactMessages, heroSlides, companyLocations,
  homeStats, homeFeatures, homeCategories, homeProcessSteps, homeSections,
  footerSections, mediaAssets, chatSessions, chatMessages, chatLeads, pageViews,
  blogPosts, productPopularity, featuredRotation, offers, offerItems,
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
  type CompanyLocation, type InsertCompanyLocation,
  type HomeStat, type InsertHomeStat,
  type HomeFeature, type InsertHomeFeature,
  type HomeCategory, type InsertHomeCategory,
  type HomeProcessStep, type InsertHomeProcessStep,
  type HomeSection, type InsertHomeSection,
  type FooterSection, type InsertFooterSection,
  type MediaAsset, type InsertMediaAsset,
  type ChatSession, type InsertChatSession,
  type ChatMessage, type InsertChatMessage,
  type ChatLead, type InsertChatLead,
  type PageView, type InsertPageView,
  type BlogPost, type InsertBlogPost,
  type ProductPopularity, type InsertProductPopularity,
  type FeaturedRotation, type InsertFeaturedRotation,
  type Offer, type InsertOffer,
  type OfferItem, type InsertOfferItem,
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
  getProductBySlug(slug: string): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;
  getAllProducts(options?: { activeOnly?: boolean; featuredOnly?: boolean; limit?: number; offset?: number; page?: number }): Promise<Product[]>;
  getProductsByCategory(categoryId: number, options?: { activeOnly?: boolean; limit?: number; offset?: number }): Promise<Product[]>;
  getProductsByBrand(brandId: number, options?: { activeOnly?: boolean; limit?: number; offset?: number }): Promise<Product[]>;
  searchProducts(query: string, options?: { activeOnly?: boolean; limit?: number; offset?: number }): Promise<Product[]>;
  searchProductsFullText(query: string, options?: { activeOnly?: boolean; limit?: number; offset?: number }): Promise<Product[]>;
  getProductCount(options?: { activeOnly?: boolean; categoryId?: number; brandId?: number; search?: string }): Promise<number>;
  bulkCreateProducts(products: InsertProduct[]): Promise<Product[]>;
  
  // Intelligent Product Sorting
  getTodayFeaturedRotation(): Promise<FeaturedRotation | undefined>;
  createFeaturedRotation(productIds: number[], criteria?: object): Promise<FeaturedRotation>;
  trackProductView(productId: number): Promise<void>;
  getDirectDistributorBrandIds(): Promise<number[]>;

  // Offers
  getOffer(id: number): Promise<Offer | undefined>;
  getOfferBySlug(slug: string): Promise<Offer | undefined>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  updateOffer(id: number, updates: Partial<InsertOffer>): Promise<Offer | undefined>;
  deleteOffer(id: number): Promise<void>;
  getAllOffers(): Promise<Offer[]>;
  getActiveOffers(): Promise<Offer[]>;
  getOfferItems(offerId: number): Promise<(OfferItem & { product: Product })[]>;
  createOfferItem(item: InsertOfferItem): Promise<OfferItem>;
  updateOfferItem(id: number, updates: Partial<InsertOfferItem>): Promise<OfferItem | undefined>;
  deleteOfferItem(id: number): Promise<void>;
  deleteOfferItemsByOffer(offerId: number): Promise<void>;

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

  // Company Locations
  getCompanyLocation(id: number): Promise<CompanyLocation | undefined>;
  createCompanyLocation(location: InsertCompanyLocation): Promise<CompanyLocation>;
  updateCompanyLocation(id: number, updates: Partial<InsertCompanyLocation>): Promise<CompanyLocation | undefined>;
  deleteCompanyLocation(id: number): Promise<void>;
  getAllCompanyLocations(): Promise<CompanyLocation[]>;
  getActiveCompanyLocations(): Promise<CompanyLocation[]>;

  // Footer Sections
  getFooterSection(id: number): Promise<FooterSection | undefined>;
  getFooterSectionByKey(sectionKey: string): Promise<FooterSection | undefined>;
  createFooterSection(section: InsertFooterSection): Promise<FooterSection>;
  updateFooterSection(id: number, updates: Partial<InsertFooterSection>): Promise<FooterSection | undefined>;
  deleteFooterSection(id: number): Promise<void>;
  getAllFooterSections(): Promise<FooterSection[]>;
  getActiveFooterSections(): Promise<FooterSection[]>;

  // Media Assets
  getMediaAsset(id: number): Promise<MediaAsset | undefined>;
  createMediaAsset(asset: InsertMediaAsset): Promise<MediaAsset>;
  deleteMediaAsset(id: number): Promise<void>;
  getAllMediaAssets(category?: string): Promise<MediaAsset[]>;

  // Chat
  getChatSession(sessionId: string): Promise<ChatSession | undefined>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  updateChatSession(sessionId: string, updates: Partial<InsertChatSession>): Promise<ChatSession | undefined>;
  getChatMessages(sessionId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getAllChatSessions(): Promise<ChatSession[]>;
  createChatLead(lead: InsertChatLead): Promise<ChatLead>;
  getAllChatLeads(): Promise<ChatLead[]>;
  getChatLeadByEmailSince(email: string, since: Date): Promise<ChatLead | undefined>;
  updateChatLead(id: number, updates: Partial<InsertChatLead>): Promise<ChatLead | undefined>;

  // Blog Posts
  getBlogPost(id: number): Promise<BlogPost | undefined>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: number, updates: Partial<InsertBlogPost>): Promise<BlogPost | undefined>;
  deleteBlogPost(id: number): Promise<void>;
  getAllBlogPosts(options?: { publishedOnly?: boolean; limit?: number; offset?: number }): Promise<BlogPost[]>;
  getBlogPostCount(publishedOnly?: boolean): Promise<number>;

  // Page Views (Analytics)
  createPageView(pageView: InsertPageView): Promise<PageView>;
  getAnalytics(daysAgo: number): Promise<{
    totalPageViews: number;
    uniqueVisitors: number;
    topPages: { pagePath: string; views: number }[];
    deviceBreakdown: { deviceType: string; count: number }[];
    browserBreakdown: { browser: string; count: number }[];
    dailyViews: { date: string; views: number }[];
    recentRegistrations: number;
    recentQuotes: number;
  }>;
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

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.slug, slug));
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

  async getAllProducts(options: { activeOnly?: boolean; featuredOnly?: boolean; limit?: number; offset?: number; page?: number } = {}): Promise<Product[]> {
    const { activeOnly = false, featuredOnly = false, limit, offset, page = 1 } = options;
    const conditions = [];
    if (activeOnly) conditions.push(eq(products.isActive, true));
    if (featuredOnly) conditions.push(eq(products.isFeatured, true));

    // For page 1, try intelligent sorting with daily rotation (gracefully handle missing table)
    if (page === 1 && offset === 0) {
      try {
        // Get today's featured rotation or generate one
        const today = new Date().toISOString().split('T')[0];
        let rotation = await db.select().from(featuredRotation)
          .where(eq(featuredRotation.rotationDate, today))
          .limit(1);
        
        if (rotation.length === 0) {
          // Generate new daily rotation
          await this.generateDailyRotation();
          rotation = await db.select().from(featuredRotation)
            .where(eq(featuredRotation.rotationDate, today))
            .limit(1);
        }
        
        if (rotation.length > 0 && rotation[0].productIds) {
          const featuredIds = JSON.parse(rotation[0].productIds) as number[];
          if (featuredIds.length > 0 && limit) {
            // Get featured products in order
            const featuredProducts = await db.select().from(products)
              .where(and(
                inArray(products.id, featuredIds),
                eq(products.isActive, true)
              ));
            
            // Sort by the order in featuredIds
            const sortedFeatured = featuredIds
              .map(id => featuredProducts.find(p => p.id === id))
              .filter((p): p is Product => p !== undefined)
              .slice(0, limit);
            
            // If we need more products to fill the page
            if (sortedFeatured.length < limit) {
              const remainingCount = limit - sortedFeatured.length;
              const existingIds = sortedFeatured.map(p => p.id);
              
              const moreProducts = await db.select().from(products)
                .leftJoin(brands, eq(products.brandId, brands.id))
                .where(and(
                  eq(products.isActive, true),
                  sql`${products.id} NOT IN (${existingIds.length > 0 ? existingIds.join(',') : '0'})`
                ))
                .orderBy(
                  sql`${brands.isDirectDistributor} DESC NULLS LAST`,
                  sql`${products.imageUrl} IS NULL`,
                  asc(products.productName)
                )
                .limit(remainingCount);
              
              return [...sortedFeatured, ...moreProducts.map(r => r.products)];
            }
            
            return sortedFeatured;
          }
        }
      } catch (err) {
        // Rotation table may not exist yet - fall through to default sorting
        console.warn("Featured rotation not available, using default intelligent sorting");
      }
    }

    // Default intelligent sorting: direct distributor brands first, then products with images, then alphabetical
    const result = await db.select({
      product: products
    }).from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(activeOnly ? eq(products.isActive, true) : undefined)
      .orderBy(
        sql`${brands.isDirectDistributor} DESC NULLS LAST`,
        sql`${products.imageUrl} IS NULL`,
        asc(products.productName)
      )
      .limit(limit || 50)
      .offset(offset || 0);
    
    return result.map(r => r.product);
  }

  // Generate daily featured rotation
  async generateDailyRotation(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // Get direct distributor brand IDs
    const directBrands = await db.select({ id: brands.id })
      .from(brands)
      .where(and(
        eq(brands.isDirectDistributor, true),
        eq(brands.isActive, true)
      ));
    const directBrandIds = directBrands.map(b => b.id);
    
    // Get products from direct distributor brands with images
    let featuredProducts: Product[] = [];
    
    if (directBrandIds.length > 0) {
      featuredProducts = await db.select().from(products)
        .where(and(
          eq(products.isActive, true),
          inArray(products.brandId, directBrandIds),
          sql`${products.imageUrl} IS NOT NULL`
        ))
        .limit(200); // Get pool of candidates
    }
    
    // Shuffle and select 50 for today's rotation
    const shuffled = featuredProducts.sort(() => Math.random() - 0.5);
    const selectedIds = shuffled.slice(0, 50).map(p => p.id);
    
    // If not enough direct distributor products, fill with other products with images
    if (selectedIds.length < 50) {
      const remainingCount = 50 - selectedIds.length;
      const moreProducts = await db.select().from(products)
        .where(and(
          eq(products.isActive, true),
          sql`${products.imageUrl} IS NOT NULL`,
          selectedIds.length > 0 ? sql`${products.id} NOT IN (${selectedIds.join(',')})` : undefined
        ))
        .limit(remainingCount * 2);
      
      const moreShuffled = moreProducts.sort(() => Math.random() - 0.5);
      selectedIds.push(...moreShuffled.slice(0, remainingCount).map(p => p.id));
    }
    
    // Store the rotation
    await db.insert(featuredRotation).values({
      rotationDate: today,
      productIds: JSON.stringify(selectedIds),
      selectionCriteria: JSON.stringify({
        directDistributorBrands: directBrandIds.length,
        totalSelected: selectedIds.length,
        generatedAt: new Date().toISOString()
      })
    }).onConflictDoNothing();
  }

  async getProductsByCategory(categoryId: number, options: { activeOnly?: boolean; limit?: number; offset?: number } = {}): Promise<Product[]> {
    const { activeOnly = false, limit = 24, offset = 0 } = options;
    const conditions = [
      or(eq(products.categoryId, categoryId), eq(products.subcategoryId, categoryId))
    ];
    if (activeOnly) conditions.push(eq(products.isActive, true));
    return db.select().from(products)
      .where(and(...conditions))
      .orderBy(sql`${products.imageUrl} IS NULL`, asc(products.productName))
      .limit(limit)
      .offset(offset);
  }

  async getProductsByBrand(brandId: number, options: { activeOnly?: boolean; limit?: number; offset?: number } = {}): Promise<Product[]> {
    const { activeOnly = false, limit = 24, offset = 0 } = options;
    const conditions = [eq(products.brandId, brandId)];
    if (activeOnly) conditions.push(eq(products.isActive, true));
    return db.select().from(products)
      .where(and(...conditions))
      .orderBy(sql`${products.imageUrl} IS NULL`, asc(products.productName))
      .limit(limit)
      .offset(offset);
  }

  async searchProducts(query: string, options: { activeOnly?: boolean; limit?: number; offset?: number } = {}): Promise<Product[]> {
    const { activeOnly = false, limit = 24, offset = 0 } = options;
    const searchTerm = `%${query}%`;
    const conditions = [
      or(
        ilike(products.productName, searchTerm),
        ilike(products.sku, searchTerm),
        ilike(products.shortDescription, searchTerm)
      )
    ];
    if (activeOnly) conditions.push(eq(products.isActive, true));
    return db.select().from(products)
      .where(and(...conditions))
      .orderBy(sql`${products.imageUrl} IS NULL`, asc(products.productName))
      .limit(limit)
      .offset(offset);
  }

  async searchProductsFullText(query: string, options: { activeOnly?: boolean; limit?: number; offset?: number } = {}): Promise<Product[]> {
    const { activeOnly = false, limit = 24, offset = 0 } = options;
    const searchTerm = query.trim();
    
    if (!searchTerm) return [];
    
    const isSkuSearch = /^[0-9]{5,}$/.test(searchTerm) || /^[0-9]+-?[0-9]+$/.test(searchTerm);
    
    const transformRow = (row: any): Product => ({
      id: row.id,
      sku: row.sku,
      ean: row.ean,
      brandId: row.brand_id,
      productName: row.product_name,
      shortDescription: row.short_description,
      longDescription: row.long_description,
      categoryId: row.category_id,
      subcategoryId: row.subcategory_id,
      packSize: row.pack_size,
      caseSize: row.case_size,
      uom: row.uom,
      rrp: row.rrp,
      wholesalePrice: row.wholesale_price,
      moq: row.moq,
      vatRate: row.vat_rate,
      isActive: row.is_active,
      isFeatured: row.is_featured,
      imageUrl: row.image_url,
      countryOfOrigin: row.country_of_origin,
      productType: row.product_type,
      storageConditions: row.storage_conditions,
      notesInternal: row.notes_internal,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      slug: row.slug,
      metaTitle: row.meta_title,
      metaDescription: row.meta_description,
      googleFeedPrice: row.google_feed_price,
    });
    
    try {
      if (isSkuSearch) {
        const result = await db.execute(sql`
          SELECT * FROM ${products}
          WHERE (sku ILIKE ${'%' + searchTerm + '%'} OR ean ILIKE ${'%' + searchTerm + '%'})
          ${activeOnly ? sql`AND is_active = true` : sql``}
          ORDER BY 
            image_url IS NULL,
            CASE WHEN sku = ${searchTerm} OR ean = ${searchTerm} THEN 0 ELSE 1 END,
            product_name ASC
          LIMIT ${limit} OFFSET ${offset}
        `);
        return result.rows.map(transformRow);
      }
      
      const activeFilter = activeOnly ? sql`AND is_active = true` : sql``;
      const ilikeTerm = '%' + searchTerm + '%';
      
      const result = await db.execute(sql`
        SELECT *, 
          GREATEST(
            similarity(COALESCE(product_name, ''), ${searchTerm}),
            similarity(COALESCE(short_description, ''), ${searchTerm})
          ) AS sim_score,
          CASE WHEN LOWER(product_name) LIKE LOWER(${ilikeTerm}) THEN 1 ELSE 0 END AS exact_match,
          CASE WHEN LOWER(sku) LIKE LOWER(${ilikeTerm}) THEN 1 ELSE 0 END AS sku_match,
          ts_rank_cd(
            to_tsvector('english', COALESCE(product_name, '') || ' ' || COALESCE(short_description, '')),
            plainto_tsquery('english', ${searchTerm})
          ) AS fts_rank
        FROM ${products}
        WHERE (
          LOWER(product_name) LIKE LOWER(${ilikeTerm})
          OR LOWER(sku) LIKE LOWER(${ilikeTerm})
          OR LOWER(ean) LIKE LOWER(${ilikeTerm})
          OR similarity(COALESCE(product_name, ''), ${searchTerm}) > 0.15
          OR to_tsvector('english', COALESCE(product_name, '') || ' ' || COALESCE(short_description, '')) @@ plainto_tsquery('english', ${searchTerm})
        )
        ${activeFilter}
        ORDER BY 
          exact_match DESC,
          sku_match DESC,
          fts_rank DESC,
          sim_score DESC,
          image_url IS NULL,
          product_name ASC
        LIMIT ${limit} OFFSET ${offset}
      `);
      
      return result.rows.map(transformRow);
    } catch (err) {
      console.error("Advanced search failed, falling back to ILIKE:", err);
      return this.searchProducts(query, options);
    }
  }

  async getProductCount(options: { activeOnly?: boolean; categoryId?: number; brandId?: number; search?: string } = {}): Promise<number> {
    const { activeOnly = false, categoryId, brandId, search } = options;
    
    if (search && search.trim().length > 0) {
      const searchTerm = search.trim();
      const isSkuSearch = /^[0-9]{5,}$/.test(searchTerm) || /^[0-9]+-?[0-9]+$/.test(searchTerm);
      const ilikeTerm = '%' + searchTerm + '%';
      const activeFilter = activeOnly ? sql`AND is_active = true` : sql``;
      const categoryFilter = categoryId ? sql`AND (category_id = ${categoryId} OR subcategory_id = ${categoryId})` : sql``;
      const brandFilter = brandId ? sql`AND brand_id = ${brandId}` : sql``;
      
      try {
        let result;
        if (isSkuSearch) {
          result = await db.execute(sql`
            SELECT count(*) FROM ${products}
            WHERE (sku ILIKE ${ilikeTerm} OR ean ILIKE ${ilikeTerm})
            ${activeFilter} ${categoryFilter} ${brandFilter}
          `);
        } else {
          result = await db.execute(sql`
            SELECT count(*) FROM ${products}
            WHERE (
              LOWER(product_name) LIKE LOWER(${ilikeTerm})
              OR LOWER(sku) LIKE LOWER(${ilikeTerm})
              OR LOWER(ean) LIKE LOWER(${ilikeTerm})
              OR similarity(COALESCE(product_name, ''), ${searchTerm}) > 0.15
              OR to_tsvector('english', COALESCE(product_name, '') || ' ' || COALESCE(short_description, '')) @@ plainto_tsquery('english', ${searchTerm})
            )
            ${activeFilter} ${categoryFilter} ${brandFilter}
          `);
        }
        return Number(result.rows[0]?.count ?? 0);
      } catch (err) {
        console.error("Search count failed, falling back to ILIKE:", err);
        const conditions = [];
        if (activeOnly) conditions.push(eq(products.isActive, true));
        if (categoryId) conditions.push(or(eq(products.categoryId, categoryId), eq(products.subcategoryId, categoryId)));
        if (brandId) conditions.push(eq(products.brandId, brandId));
        const fallbackTerm = `%${search}%`;
        conditions.push(or(
          ilike(products.productName, fallbackTerm),
          ilike(products.sku, fallbackTerm)
        ));
        const fallbackResult = await db.select({ count: sql<number>`count(*)` })
          .from(products)
          .where(and(...conditions));
        return Number(fallbackResult[0]?.count ?? 0);
      }
    }
    
    const conditions = [];
    if (activeOnly) conditions.push(eq(products.isActive, true));
    if (categoryId) conditions.push(or(eq(products.categoryId, categoryId), eq(products.subcategoryId, categoryId)));
    if (brandId) conditions.push(eq(products.brandId, brandId));
    
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(products)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
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

  // ==================== BLOG POSTS ====================
  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return post;
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug));
    return post;
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const [created] = await db.insert(blogPosts).values(post).returning();
    return created;
  }

  async updateBlogPost(id: number, updates: Partial<InsertBlogPost>): Promise<BlogPost | undefined> {
    const [updated] = await db.update(blogPosts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    return updated;
  }

  async deleteBlogPost(id: number): Promise<void> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
  }

  async getAllBlogPosts(options: { publishedOnly?: boolean; limit?: number; offset?: number } = {}): Promise<BlogPost[]> {
    const { publishedOnly = false, limit, offset } = options;
    
    let query = db.select().from(blogPosts);
    
    if (publishedOnly) {
      query = query.where(eq(blogPosts.status, 'published')) as typeof query;
    }
    
    query = query.orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt)) as typeof query;
    
    if (limit) query = query.limit(limit) as typeof query;
    if (offset) query = query.offset(offset) as typeof query;
    
    return query;
  }

  async getBlogPostCount(publishedOnly?: boolean): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .where(publishedOnly ? eq(blogPosts.status, 'published') : undefined);
    return Number(result[0]?.count ?? 0);
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

  // ==================== COMPANY LOCATIONS ====================
  async getCompanyLocation(id: number): Promise<CompanyLocation | undefined> {
    const [location] = await db.select().from(companyLocations).where(eq(companyLocations.id, id));
    return location;
  }

  async createCompanyLocation(location: InsertCompanyLocation): Promise<CompanyLocation> {
    const [created] = await db.insert(companyLocations).values(location).returning();
    return created;
  }

  async updateCompanyLocation(id: number, updates: Partial<InsertCompanyLocation>): Promise<CompanyLocation | undefined> {
    const [updated] = await db.update(companyLocations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companyLocations.id, id))
      .returning();
    return updated;
  }

  async deleteCompanyLocation(id: number): Promise<void> {
    await db.delete(companyLocations).where(eq(companyLocations.id, id));
  }

  async getAllCompanyLocations(): Promise<CompanyLocation[]> {
    return db.select().from(companyLocations).orderBy(asc(companyLocations.position));
  }

  async getActiveCompanyLocations(): Promise<CompanyLocation[]> {
    return db.select().from(companyLocations)
      .where(eq(companyLocations.isActive, true))
      .orderBy(asc(companyLocations.position));
  }

  // ==================== HOMEPAGE STATS ====================
  async getHomeStat(id: number): Promise<HomeStat | undefined> {
    const [stat] = await db.select().from(homeStats).where(eq(homeStats.id, id));
    return stat;
  }

  async createHomeStat(stat: InsertHomeStat): Promise<HomeStat> {
    const [created] = await db.insert(homeStats).values(stat).returning();
    return created;
  }

  async updateHomeStat(id: number, updates: Partial<InsertHomeStat>): Promise<HomeStat | undefined> {
    const [updated] = await db.update(homeStats)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(homeStats.id, id))
      .returning();
    return updated;
  }

  async deleteHomeStat(id: number): Promise<void> {
    await db.delete(homeStats).where(eq(homeStats.id, id));
  }

  async getAllHomeStats(): Promise<HomeStat[]> {
    return db.select().from(homeStats).orderBy(asc(homeStats.position));
  }

  async getActiveHomeStats(): Promise<HomeStat[]> {
    return db.select().from(homeStats)
      .where(eq(homeStats.isActive, true))
      .orderBy(asc(homeStats.position));
  }

  // ==================== HOMEPAGE FEATURES ====================
  async getHomeFeature(id: number): Promise<HomeFeature | undefined> {
    const [feature] = await db.select().from(homeFeatures).where(eq(homeFeatures.id, id));
    return feature;
  }

  async createHomeFeature(feature: InsertHomeFeature): Promise<HomeFeature> {
    const [created] = await db.insert(homeFeatures).values(feature).returning();
    return created;
  }

  async updateHomeFeature(id: number, updates: Partial<InsertHomeFeature>): Promise<HomeFeature | undefined> {
    const [updated] = await db.update(homeFeatures)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(homeFeatures.id, id))
      .returning();
    return updated;
  }

  async deleteHomeFeature(id: number): Promise<void> {
    await db.delete(homeFeatures).where(eq(homeFeatures.id, id));
  }

  async getAllHomeFeatures(): Promise<HomeFeature[]> {
    return db.select().from(homeFeatures).orderBy(asc(homeFeatures.position));
  }

  async getActiveHomeFeatures(): Promise<HomeFeature[]> {
    return db.select().from(homeFeatures)
      .where(eq(homeFeatures.isActive, true))
      .orderBy(asc(homeFeatures.position));
  }

  // ==================== HOMEPAGE CATEGORIES ====================
  async getHomeCategory(id: number): Promise<HomeCategory | undefined> {
    const [category] = await db.select().from(homeCategories).where(eq(homeCategories.id, id));
    return category;
  }

  async createHomeCategory(category: InsertHomeCategory): Promise<HomeCategory> {
    const [created] = await db.insert(homeCategories).values(category).returning();
    return created;
  }

  async updateHomeCategory(id: number, updates: Partial<InsertHomeCategory>): Promise<HomeCategory | undefined> {
    const [updated] = await db.update(homeCategories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(homeCategories.id, id))
      .returning();
    return updated;
  }

  async deleteHomeCategory(id: number): Promise<void> {
    await db.delete(homeCategories).where(eq(homeCategories.id, id));
  }

  async getAllHomeCategories(): Promise<HomeCategory[]> {
    return db.select().from(homeCategories).orderBy(asc(homeCategories.position));
  }

  async getActiveHomeCategories(): Promise<HomeCategory[]> {
    return db.select().from(homeCategories)
      .where(eq(homeCategories.isActive, true))
      .orderBy(asc(homeCategories.position));
  }

  // ==================== HOMEPAGE PROCESS STEPS ====================
  async getHomeProcessStep(id: number): Promise<HomeProcessStep | undefined> {
    const [step] = await db.select().from(homeProcessSteps).where(eq(homeProcessSteps.id, id));
    return step;
  }

  async createHomeProcessStep(step: InsertHomeProcessStep): Promise<HomeProcessStep> {
    const [created] = await db.insert(homeProcessSteps).values(step).returning();
    return created;
  }

  async updateHomeProcessStep(id: number, updates: Partial<InsertHomeProcessStep>): Promise<HomeProcessStep | undefined> {
    const [updated] = await db.update(homeProcessSteps)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(homeProcessSteps.id, id))
      .returning();
    return updated;
  }

  async deleteHomeProcessStep(id: number): Promise<void> {
    await db.delete(homeProcessSteps).where(eq(homeProcessSteps.id, id));
  }

  async getAllHomeProcessSteps(): Promise<HomeProcessStep[]> {
    return db.select().from(homeProcessSteps).orderBy(asc(homeProcessSteps.position));
  }

  async getActiveHomeProcessSteps(): Promise<HomeProcessStep[]> {
    return db.select().from(homeProcessSteps)
      .where(eq(homeProcessSteps.isActive, true))
      .orderBy(asc(homeProcessSteps.position));
  }

  // ==================== HOMEPAGE SECTIONS ====================
  async getHomeSection(id: number): Promise<HomeSection | undefined> {
    const [section] = await db.select().from(homeSections).where(eq(homeSections.id, id));
    return section;
  }

  async getHomeSectionByKey(sectionKey: string): Promise<HomeSection | undefined> {
    const [section] = await db.select().from(homeSections).where(eq(homeSections.sectionKey, sectionKey));
    return section;
  }

  async createHomeSection(section: InsertHomeSection): Promise<HomeSection> {
    const [created] = await db.insert(homeSections).values(section).returning();
    return created;
  }

  async updateHomeSection(id: number, updates: Partial<InsertHomeSection>): Promise<HomeSection | undefined> {
    const [updated] = await db.update(homeSections)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(homeSections.id, id))
      .returning();
    return updated;
  }

  async deleteHomeSection(id: number): Promise<void> {
    await db.delete(homeSections).where(eq(homeSections.id, id));
  }

  async getAllHomeSections(): Promise<HomeSection[]> {
    return db.select().from(homeSections).orderBy(asc(homeSections.position));
  }

  async getActiveHomeSections(): Promise<HomeSection[]> {
    return db.select().from(homeSections)
      .where(eq(homeSections.isActive, true))
      .orderBy(asc(homeSections.position));
  }

  // ==================== FOOTER SECTIONS ====================
  async getFooterSection(id: number): Promise<FooterSection | undefined> {
    const [section] = await db.select().from(footerSections).where(eq(footerSections.id, id));
    return section;
  }

  async getFooterSectionByKey(sectionKey: string): Promise<FooterSection | undefined> {
    const [section] = await db.select().from(footerSections).where(eq(footerSections.sectionKey, sectionKey));
    return section;
  }

  async createFooterSection(section: InsertFooterSection): Promise<FooterSection> {
    const [created] = await db.insert(footerSections).values(section).returning();
    return created;
  }

  async updateFooterSection(id: number, updates: Partial<InsertFooterSection>): Promise<FooterSection | undefined> {
    const [updated] = await db.update(footerSections)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(footerSections.id, id))
      .returning();
    return updated;
  }

  async deleteFooterSection(id: number): Promise<void> {
    await db.delete(footerSections).where(eq(footerSections.id, id));
  }

  async getAllFooterSections(): Promise<FooterSection[]> {
    return db.select().from(footerSections).orderBy(asc(footerSections.sectionKey));
  }

  async getActiveFooterSections(): Promise<FooterSection[]> {
    return db.select().from(footerSections)
      .where(eq(footerSections.isActive, true))
      .orderBy(asc(footerSections.sectionKey));
  }

  // ==================== MEDIA ASSETS ====================
  async getMediaAsset(id: number): Promise<MediaAsset | undefined> {
    const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id));
    return asset;
  }

  async createMediaAsset(asset: InsertMediaAsset): Promise<MediaAsset> {
    const [created] = await db.insert(mediaAssets).values(asset).returning();
    return created;
  }

  async deleteMediaAsset(id: number): Promise<void> {
    await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  }

  async getAllMediaAssets(category?: string): Promise<MediaAsset[]> {
    if (category) {
      return db.select().from(mediaAssets)
        .where(eq(mediaAssets.category, category))
        .orderBy(desc(mediaAssets.createdAt));
    }
    return db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt));
  }

  // ==================== CHAT ====================
  async getChatSession(sessionId: string): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.sessionId, sessionId));
    return session;
  }

  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    const [created] = await db.insert(chatSessions).values(session).returning();
    return created;
  }

  async updateChatSession(sessionId: string, updates: Partial<InsertChatSession>): Promise<ChatSession | undefined> {
    const [updated] = await db.update(chatSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(chatSessions.sessionId, sessionId))
      .returning();
    return updated;
  }

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    return db.select().from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt));
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [created] = await db.insert(chatMessages).values(message).returning();
    return created;
  }

  async getAllChatSessions(): Promise<ChatSession[]> {
    return db.select().from(chatSessions).orderBy(desc(chatSessions.createdAt));
  }

  async createChatLead(lead: InsertChatLead): Promise<ChatLead> {
    const [created] = await db.insert(chatLeads).values(lead).returning();
    return created;
  }

  async getAllChatLeads(): Promise<ChatLead[]> {
    return db.select().from(chatLeads).orderBy(desc(chatLeads.createdAt));
  }

  async getChatLeadByEmailSince(email: string, since: Date): Promise<ChatLead | undefined> {
    const { gte, ilike } = await import("drizzle-orm");
    const [lead] = await db.select().from(chatLeads)
      .where(sql`LOWER(email) = LOWER(${email}) AND created_at >= ${since}`)
      .limit(1);
    return lead;
  }

  async updateChatLead(id: number, updates: Partial<InsertChatLead>): Promise<ChatLead | undefined> {
    const [updated] = await db.update(chatLeads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(chatLeads.id, id))
      .returning();
    return updated;
  }

  // ==================== PAGE VIEWS (ANALYTICS) ====================
  async createPageView(pageView: InsertPageView): Promise<PageView> {
    const [created] = await db.insert(pageViews).values(pageView).returning();
    return created;
  }

  async getAnalytics(daysAgo: number): Promise<{
    totalPageViews: number;
    uniqueVisitors: number;
    topPages: { pagePath: string; views: number }[];
    deviceBreakdown: { deviceType: string; count: number }[];
    browserBreakdown: { browser: string; count: number }[];
    dailyViews: { date: string; views: number }[];
    recentRegistrations: number;
    recentQuotes: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    startDate.setHours(0, 0, 0, 0);

    // Total page views in period
    const totalResult = await db.select({ count: sql<number>`count(*)` })
      .from(pageViews)
      .where(sql`${pageViews.createdAt} >= ${startDate}`);
    const totalPageViews = Number(totalResult[0]?.count || 0);

    // Unique visitors (by session or IP)
    const uniqueResult = await db.select({ count: sql<number>`count(distinct coalesce(${pageViews.sessionId}, ${pageViews.ipAddress}))` })
      .from(pageViews)
      .where(sql`${pageViews.createdAt} >= ${startDate}`);
    const uniqueVisitors = Number(uniqueResult[0]?.count || 0);

    // Top pages
    const topPagesResult = await db.select({ 
      pagePath: pageViews.pagePath, 
      views: sql<number>`count(*)` 
    })
      .from(pageViews)
      .where(sql`${pageViews.createdAt} >= ${startDate}`)
      .groupBy(pageViews.pagePath)
      .orderBy(sql`count(*) desc`)
      .limit(10);
    const topPages = topPagesResult.map(r => ({ pagePath: r.pagePath, views: Number(r.views) }));

    // Device breakdown
    const deviceResult = await db.select({ 
      deviceType: pageViews.deviceType, 
      count: sql<number>`count(*)` 
    })
      .from(pageViews)
      .where(sql`${pageViews.createdAt} >= ${startDate}`)
      .groupBy(pageViews.deviceType);
    const deviceBreakdown = deviceResult.map(r => ({ deviceType: r.deviceType || 'unknown', count: Number(r.count) }));

    // Browser breakdown
    const browserResult = await db.select({ 
      browser: pageViews.browser, 
      count: sql<number>`count(*)` 
    })
      .from(pageViews)
      .where(sql`${pageViews.createdAt} >= ${startDate}`)
      .groupBy(pageViews.browser);
    const browserBreakdown = browserResult.map(r => ({ browser: r.browser || 'unknown', count: Number(r.count) }));

    // Daily views
    const dailyResult = await db.select({ 
      date: sql<string>`date(${pageViews.createdAt})`, 
      views: sql<number>`count(*)` 
    })
      .from(pageViews)
      .where(sql`${pageViews.createdAt} >= ${startDate}`)
      .groupBy(sql`date(${pageViews.createdAt})`)
      .orderBy(sql`date(${pageViews.createdAt})`);
    const dailyViews = dailyResult.map(r => ({ date: String(r.date), views: Number(r.views) }));

    // Recent registrations (customers in period)
    const regResult = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(
        sql`${users.createdAt} >= ${startDate}`,
        eq(users.role, 'customer')
      ));
    const recentRegistrations = Number(regResult[0]?.count || 0);

    // Recent quotes in period
    const quotesResult = await db.select({ count: sql<number>`count(*)` })
      .from(quotes)
      .where(sql`${quotes.createdAt} >= ${startDate}`);
    const recentQuotes = Number(quotesResult[0]?.count || 0);

    return {
      totalPageViews,
      uniqueVisitors,
      topPages,
      deviceBreakdown,
      browserBreakdown,
      dailyViews,
      recentRegistrations,
      recentQuotes,
    };
  }

  // ==================== INTELLIGENT PRODUCT SORTING ====================
  async getTodayFeaturedRotation(): Promise<FeaturedRotation | undefined> {
    const today = new Date().toISOString().split('T')[0];
    const [rotation] = await db.select().from(featuredRotation)
      .where(eq(featuredRotation.rotationDate, today))
      .limit(1);
    return rotation;
  }

  async createFeaturedRotation(productIds: number[], criteria?: object): Promise<FeaturedRotation> {
    const today = new Date().toISOString().split('T')[0];
    const [created] = await db.insert(featuredRotation).values({
      rotationDate: today,
      productIds: JSON.stringify(productIds),
      selectionCriteria: criteria ? JSON.stringify(criteria) : null,
    }).returning();
    return created;
  }

  async trackProductView(productId: number): Promise<void> {
    // Upsert product popularity record
    const existing = await db.select().from(productPopularity)
      .where(eq(productPopularity.productId, productId))
      .limit(1);
    
    if (existing.length > 0) {
      await db.update(productPopularity)
        .set({
          viewCount: sql`${productPopularity.viewCount} + 1`,
          lastViewedAt: new Date(),
          lastUpdatedAt: new Date(),
        })
        .where(eq(productPopularity.productId, productId));
    } else {
      await db.insert(productPopularity).values({
        productId,
        viewCount: 1,
        quoteAddCount: 0,
        conversionCount: 0,
        popularityScore: "0",
        lastViewedAt: new Date(),
        lastUpdatedAt: new Date(),
      }).onConflictDoNothing();
    }
  }

  async getDirectDistributorBrandIds(): Promise<number[]> {
    const directBrands = await db.select({ id: brands.id })
      .from(brands)
      .where(and(
        eq(brands.isDirectDistributor, true),
        eq(brands.isActive, true)
      ));
    return directBrands.map(b => b.id);
  }

  async getOffer(id: number): Promise<Offer | undefined> {
    const [offer] = await db.select().from(offers).where(eq(offers.id, id));
    return offer;
  }

  async getOfferBySlug(slug: string): Promise<Offer | undefined> {
    const [offer] = await db.select().from(offers).where(eq(offers.slug, slug));
    return offer;
  }

  async createOffer(offer: InsertOffer): Promise<Offer> {
    const [created] = await db.insert(offers).values(offer).returning();
    return created;
  }

  async updateOffer(id: number, updates: Partial<InsertOffer>): Promise<Offer | undefined> {
    const [updated] = await db.update(offers).set({ ...updates, updatedAt: new Date() }).where(eq(offers.id, id)).returning();
    return updated;
  }

  async deleteOffer(id: number): Promise<void> {
    await db.delete(offerItems).where(eq(offerItems.offerId, id));
    await db.delete(offers).where(eq(offers.id, id));
  }

  async getAllOffers(): Promise<Offer[]> {
    return db.select().from(offers).orderBy(desc(offers.createdAt));
  }

  async getActiveOffers(): Promise<Offer[]> {
    const now = new Date();
    return db.select().from(offers)
      .where(and(
        eq(offers.isActive, true),
        sql`${offers.startDate} <= ${now}`,
        sql`${offers.endDate} >= ${now}`
      ))
      .orderBy(asc(offers.sortOrder), desc(offers.createdAt));
  }

  async getOfferItems(offerId: number): Promise<(OfferItem & { product: Product })[]> {
    const items = await db.select()
      .from(offerItems)
      .innerJoin(products, eq(offerItems.productId, products.id))
      .where(and(eq(offerItems.offerId, offerId), eq(offerItems.isActive, true)))
      .orderBy(asc(offerItems.sortOrder));
    return items.map(row => ({ ...row.offer_items, product: row.products }));
  }

  async createOfferItem(item: InsertOfferItem): Promise<OfferItem> {
    const [created] = await db.insert(offerItems).values(item).returning();
    return created;
  }

  async updateOfferItem(id: number, updates: Partial<InsertOfferItem>): Promise<OfferItem | undefined> {
    const [updated] = await db.update(offerItems).set(updates).where(eq(offerItems.id, id)).returning();
    return updated;
  }

  async deleteOfferItem(id: number): Promise<void> {
    await db.delete(offerItems).where(eq(offerItems.id, id));
  }

  async deleteOfferItemsByOffer(offerId: number): Promise<void> {
    await db.delete(offerItems).where(eq(offerItems.offerId, offerId));
  }
}

export const storage = new DatabaseStorage();
