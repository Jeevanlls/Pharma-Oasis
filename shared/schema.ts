import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// USERS TABLE
// ============================================
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("customer"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  
  businessType: varchar("business_type", { length: 100 }),
  companyName: varchar("company_name", { length: 255 }),
  tradingName: varchar("trading_name", { length: 255 }),
  gphcNumber: varchar("gphc_number", { length: 50 }),
  companyRegistrationNumber: varchar("company_registration_number", { length: 50 }),
  vatNumber: varchar("vat_number", { length: 50 }),
  
  primaryContactName: varchar("primary_contact_name", { length: 255 }),
  jobTitle: varchar("job_title", { length: 100 }),
  phoneNumber: varchar("phone_number", { length: 50 }),
  mobileNumber: varchar("mobile_number", { length: 50 }),
  
  billingAddressLine1: varchar("billing_address_line_1", { length: 255 }),
  billingAddressLine2: varchar("billing_address_line_2", { length: 255 }),
  billingCity: varchar("billing_city", { length: 100 }),
  billingPostcode: varchar("billing_postcode", { length: 20 }),
  billingCountry: varchar("billing_country", { length: 100 }).default("United Kingdom"),
  
  deliverySameAsBilling: boolean("delivery_same_as_billing").default(true),
  deliveryAddressLine1: varchar("delivery_address_line_1", { length: 255 }),
  deliveryAddressLine2: varchar("delivery_address_line_2", { length: 255 }),
  deliveryCity: varchar("delivery_city", { length: 100 }),
  deliveryPostcode: varchar("delivery_postcode", { length: 20 }),
  deliveryCountry: varchar("delivery_country", { length: 100 }),
  
  mhraLicenceType: varchar("mhra_licence_type", { length: 100 }),
  mhraLicenceNumber: varchar("mhra_licence_number", { length: 100 }),
  responsiblePersonName: varchar("responsible_person_name", { length: 255 }),
  responsiblePersonEmail: varchar("responsible_person_email", { length: 255 }),
  coldChainCapability: boolean("cold_chain_capability").default(false),
  interestedInControlledProducts: boolean("interested_in_controlled_products").default(false),
  
  estimatedMonthlySpend: varchar("estimated_monthly_spend", { length: 50 }),
  orderingContactEmail: varchar("ordering_contact_email", { length: 255 }),
  accountsPayableEmail: varchar("accounts_payable_email", { length: 255 }),
  preferredOrderMethod: varchar("preferred_order_method", { length: 50 }),
  
  howDidYouHear: varchar("how_did_you_hear", { length: 100 }),
  notes: text("notes"),
  marketingConsent: boolean("marketing_consent").default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// BRANDS TABLE
// ============================================
export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  logoUrl: text("logo_url"),
  isDirectDistributor: boolean("is_direct_distributor").default(false),
  isActive: boolean("is_active").default(true),
  isHomeFeatured: boolean("is_home_featured").default(false),
  homePosition: integer("home_position"),
  slug: varchar("slug", { length: 255 }),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// CATEGORIES TABLE
// ============================================
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  parentId: integer("parent_id"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  slug: varchar("slug", { length: 255 }),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// PRODUCTS TABLE
// ============================================
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  ean: varchar("ean", { length: 50 }),
  brandId: integer("brand_id").notNull(),
  productName: varchar("product_name", { length: 500 }).notNull(),
  shortDescription: text("short_description"),
  longDescription: text("long_description"),
  categoryId: integer("category_id").notNull(),
  subcategoryId: integer("subcategory_id"),
  packSize: varchar("pack_size", { length: 100 }),
  caseSize: varchar("case_size", { length: 100 }),
  uom: varchar("uom", { length: 50 }),
  rrp: decimal("rrp", { precision: 10, scale: 2 }),
  wholesalePrice: decimal("wholesale_price", { precision: 10, scale: 2 }),
  moq: integer("moq").default(1),
  vatRate: decimal("vat_rate", { precision: 5, scale: 4 }),
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
  imageUrl: text("image_url"),
  countryOfOrigin: varchar("country_of_origin", { length: 100 }),
  productType: varchar("product_type", { length: 100 }),
  storageConditions: text("storage_conditions"),
  notesInternal: text("notes_internal"),
  slug: varchar("slug", { length: 255 }),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  googleFeedPrice: decimal("google_feed_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// QUOTES TABLE
// ============================================
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  customerNotes: text("customer_notes"),
  adminNotes: text("admin_notes"),
  totalEstimate: decimal("total_estimate", { precision: 12, scale: 2 }),
  expiryDate: timestamp("expiry_date"),
  version: integer("version").notNull().default(1),
  parentQuoteId: integer("parent_quote_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// QUOTE ITEMS TABLE
// ============================================
export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  lineTotal: decimal("line_total", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// SUPPLIER LEADS TABLE
// ============================================
export const supplierLeads = pgTable("supplier_leads", {
  id: serial("id").primaryKey(),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  tradingName: varchar("trading_name", { length: 255 }),
  website: text("website"),
  country: varchar("country", { length: 100 }).notNull(),
  businessType: varchar("business_type", { length: 100 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  jobTitle: varchar("job_title", { length: 100 }),
  email: varchar("email", { length: 255 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
  mhraGdpLicences: text("mhra_gdp_licences"),
  gdpAccredited: boolean("gdp_accredited").default(false),
  productCategoriesSupply: text("product_categories_supply").notNull(),
  brandNamesRepresent: text("brand_names_represent").notNull(),
  licensedUkEu: varchar("licensed_uk_eu", { length: 20 }),
  exclusivityInterest: boolean("exclusivity_interest").default(false),
  stockLocations: text("stock_locations"),
  minimumOrderQuantities: text("minimum_order_quantities"),
  logisticsCapability: text("logistics_capability"),
  proposalSummary: text("proposal_summary").notNull(),
  additionalNotes: text("additional_notes"),
  marketingConsent: boolean("marketing_consent").default(false),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// CMS BLOCKS TABLE
// ============================================
export const cmsBlocks = pgTable("cms_blocks", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  section: varchar("section", { length: 50 }).notNull(),
  content: text("content").notNull(),
  contentType: varchar("content_type", { length: 20 }).default("text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// SITE SETTINGS TABLE
// ============================================
export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// CONTACT MESSAGES TABLE
// ============================================
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).default("new"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// BLOG POSTS TABLE
// ============================================
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  featuredImage: text("featured_image"),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, published
  publishedAt: timestamp("published_at"),
  authorId: integer("author_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// HERO SLIDES TABLE
// ============================================
export const heroSlides = pgTable("hero_slides", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  subtitle: text("subtitle"),
  ctaLabel: varchar("cta_label", { length: 100 }),
  ctaHref: text("cta_href"),
  imageUrl: text("image_url").notNull(),
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// COMPANY LOCATIONS TABLE
// ============================================
export const companyLocations = pgTable("company_locations", {
  id: serial("id").primaryKey(),
  locationType: varchar("location_type", { length: 50 }).notNull(), // "headquarters", "warehouse", "branch"
  locationName: varchar("location_name", { length: 255 }).notNull(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  addressLine1: varchar("address_line_1", { length: 255 }).notNull(),
  addressLine2: varchar("address_line_2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  postcode: varchar("postcode", { length: 50 }),
  country: varchar("country", { length: 100 }).notNull(),
  vatNumber: varchar("vat_number", { length: 100 }),
  companyRegNumber: varchar("company_reg_number", { length: 100 }),
  wdaLicenceNumber: varchar("wda_licence_number", { length: 100 }),
  phoneNumber: varchar("phone_number", { length: 50 }),
  email: varchar("email", { length: 255 }),
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// HOMEPAGE STATS TABLE
// ============================================
export const homeStats = pgTable("home_stats", {
  id: serial("id").primaryKey(),
  value: varchar("value", { length: 50 }).notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).notNull().default("stat"), // "stat" or "badge"
  iconName: varchar("icon_name", { length: 50 }),
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// HOMEPAGE FEATURES TABLE
// ============================================
export const homeFeatures = pgTable("home_features", {
  id: serial("id").primaryKey(),
  iconName: varchar("icon_name", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// HOMEPAGE CATEGORIES TABLE
// ============================================
export const homeCategories = pgTable("home_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  productCount: varchar("product_count", { length: 50 }).notNull(),
  iconName: varchar("icon_name", { length: 50 }).notNull(),
  linkHref: text("link_href"),
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// HOMEPAGE PROCESS STEPS TABLE
// ============================================
export const homeProcessSteps = pgTable("home_process_steps", {
  id: serial("id").primaryKey(),
  stepNumber: integer("step_number").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// HOMEPAGE SECTIONS TABLE (for Partner With Us, Export Services, etc.)
// ============================================
export const homeSections = pgTable("home_sections", {
  id: serial("id").primaryKey(),
  sectionKey: varchar("section_key", { length: 100 }).notNull().unique(),
  badgeText: varchar("badge_text", { length: 100 }),
  badgeIcon: varchar("badge_icon", { length: 50 }),
  title: varchar("title", { length: 500 }).notNull(),
  subtitle: text("subtitle"),
  description: text("description"),
  bulletPoints: text("bullet_points"), // JSON array stored as text
  primaryCtaLabel: varchar("primary_cta_label", { length: 100 }),
  primaryCtaHref: text("primary_cta_href"),
  primaryCtaIcon: varchar("primary_cta_icon", { length: 50 }),
  secondaryCtaLabel: varchar("secondary_cta_label", { length: 100 }),
  secondaryCtaHref: text("secondary_cta_href"),
  cardTitle: varchar("card_title", { length: 255 }),
  cardSubtitle: text("card_subtitle"),
  cardIcon: varchar("card_icon", { length: 50 }),
  cardItems: text("card_items"), // JSON array stored as text
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// FOOTER SECTIONS TABLE (Privacy Policy, Terms, Cookie Policy, etc.)
// ============================================
export const footerSections = pgTable("footer_sections", {
  id: serial("id").primaryKey(),
  sectionKey: varchar("section_key", { length: 100 }).notNull().unique(), // "privacy_policy", "terms", "cookie_policy", "global_presence", "head_office"
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(), // Markdown or rich text content
  metaDescription: text("meta_description"), // SEO meta description
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// MEDIA ASSETS TABLE (for uploaded images)
// ============================================
export const mediaAssets = pgTable("media_assets", {
  id: serial("id").primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalFilename: varchar("original_filename", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  width: integer("width"),
  height: integer("height"),
  category: varchar("category", { length: 50 }).notNull(), // "brand", "product", "hero", "general"
  url: text("url").notNull(), // Path to the asset
  thumbnailUrl: text("thumbnail_url"), // Optional thumbnail for products/general
  altText: varchar("alt_text", { length: 255 }),
  uploadedBy: integer("uploaded_by"), // User ID who uploaded
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================
// RELATIONS
// ============================================
export const usersRelations = relations(users, ({ many }) => ({
  quotes: many(quotes),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "categoryParent",
  }),
  children: many(categories, { relationName: "categoryParent" }),
  products: many(products, { relationName: "productCategory" }),
  productSubcategories: many(products, { relationName: "productSubcategory" }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
    relationName: "productCategory",
  }),
  subcategory: one(categories, {
    fields: [products.subcategoryId],
    references: [categories.id],
    relationName: "productSubcategory",
  }),
  quoteItems: many(quoteItems),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  user: one(users, {
    fields: [quotes.userId],
    references: [users.id],
  }),
  items: many(quoteItems),
}));

export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteItems.quoteId],
    references: [quotes.id],
  }),
  product: one(products, {
    fields: [quoteItems.productId],
    references: [products.id],
  }),
}));

// ============================================
// ZOD SCHEMAS & TYPES
// ============================================

// User schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Profile update schema - customer-editable fields only
export const profileUpdateSchema = z.object({
  primaryContactName: z.string().max(255).optional(),
  jobTitle: z.string().max(100).optional(),
  phoneNumber: z.string().max(50).optional(),
  mobileNumber: z.string().max(50).optional(),
  billingAddressLine1: z.string().max(255).optional(),
  billingAddressLine2: z.string().max(255).optional(),
  billingCity: z.string().max(100).optional(),
  billingPostcode: z.string().max(20).optional(),
  deliveryAddressLine1: z.string().max(255).optional(),
  deliveryAddressLine2: z.string().max(255).optional(),
  deliveryCity: z.string().max(100).optional(),
  deliveryPostcode: z.string().max(20).optional(),
  deliverySameAsBilling: z.boolean().optional(),
  orderingContactEmail: z.string().email().max(255).optional().or(z.literal("")),
  accountsPayableEmail: z.string().email().max(255).optional().or(z.literal("")),
  preferredOrderMethod: z.string().max(50).optional(),
}).strict();
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

// Brand schemas
export const insertBrandSchema = createInsertSchema(brands).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectBrandSchema = createSelectSchema(brands);
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Brand = typeof brands.$inferSelect;

// Category schemas
export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectCategorySchema = createSelectSchema(categories);
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Product schemas
export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectProductSchema = createSelectSchema(products);
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Quote schemas
export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectQuoteSchema = createSelectSchema(quotes);
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

// Quote item schemas
export const insertQuoteItemSchema = createInsertSchema(quoteItems).omit({
  id: true,
  createdAt: true,
});
export const selectQuoteItemSchema = createSelectSchema(quoteItems);
export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;
export type QuoteItem = typeof quoteItems.$inferSelect;

// Supplier lead schemas
export const insertSupplierLeadSchema = createInsertSchema(supplierLeads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectSupplierLeadSchema = createSelectSchema(supplierLeads);
export type InsertSupplierLead = z.infer<typeof insertSupplierLeadSchema>;
export type SupplierLead = typeof supplierLeads.$inferSelect;

// CMS block schemas
export const insertCmsBlockSchema = createInsertSchema(cmsBlocks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectCmsBlockSchema = createSelectSchema(cmsBlocks);
export type InsertCmsBlock = z.infer<typeof insertCmsBlockSchema>;
export type CmsBlock = typeof cmsBlocks.$inferSelect;

// Site settings schemas
export const insertSiteSettingSchema = createInsertSchema(siteSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectSiteSettingSchema = createSelectSchema(siteSettings);
export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;
export type SiteSetting = typeof siteSettings.$inferSelect;

// Contact message schemas
export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectContactMessageSchema = createSelectSchema(contactMessages);
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;

// Blog posts schemas
export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectBlogPostSchema = createSelectSchema(blogPosts);
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

// Hero slides schemas
export const insertHeroSlideSchema = createInsertSchema(heroSlides).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectHeroSlideSchema = createSelectSchema(heroSlides);
export type InsertHeroSlide = z.infer<typeof insertHeroSlideSchema>;
export type HeroSlide = typeof heroSlides.$inferSelect;

// Company locations schemas
export const insertCompanyLocationSchema = createInsertSchema(companyLocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectCompanyLocationSchema = createSelectSchema(companyLocations);
export type InsertCompanyLocation = z.infer<typeof insertCompanyLocationSchema>;
export type CompanyLocation = typeof companyLocations.$inferSelect;

// Homepage stats schemas
export const insertHomeStatSchema = createInsertSchema(homeStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectHomeStatSchema = createSelectSchema(homeStats);
export type InsertHomeStat = z.infer<typeof insertHomeStatSchema>;
export type HomeStat = typeof homeStats.$inferSelect;

// Homepage features schemas
export const insertHomeFeatureSchema = createInsertSchema(homeFeatures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectHomeFeatureSchema = createSelectSchema(homeFeatures);
export type InsertHomeFeature = z.infer<typeof insertHomeFeatureSchema>;
export type HomeFeature = typeof homeFeatures.$inferSelect;

// Homepage categories schemas
export const insertHomeCategorySchema = createInsertSchema(homeCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectHomeCategorySchema = createSelectSchema(homeCategories);
export type InsertHomeCategory = z.infer<typeof insertHomeCategorySchema>;
export type HomeCategory = typeof homeCategories.$inferSelect;

// Homepage process steps schemas
export const insertHomeProcessStepSchema = createInsertSchema(homeProcessSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectHomeProcessStepSchema = createSelectSchema(homeProcessSteps);
export type InsertHomeProcessStep = z.infer<typeof insertHomeProcessStepSchema>;
export type HomeProcessStep = typeof homeProcessSteps.$inferSelect;

// Homepage sections schemas
export const insertHomeSectionSchema = createInsertSchema(homeSections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectHomeSectionSchema = createSelectSchema(homeSections);
export type InsertHomeSection = z.infer<typeof insertHomeSectionSchema>;
export type HomeSection = typeof homeSections.$inferSelect;

// Footer sections schemas
export const insertFooterSectionSchema = createInsertSchema(footerSections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectFooterSectionSchema = createSelectSchema(footerSections);
export type InsertFooterSection = z.infer<typeof insertFooterSectionSchema>;
export type FooterSection = typeof footerSections.$inferSelect;

// Media assets schemas
export const insertMediaAssetSchema = createInsertSchema(mediaAssets).omit({
  id: true,
  createdAt: true,
});
export const selectMediaAssetSchema = createSelectSchema(mediaAssets);
export type InsertMediaAsset = z.infer<typeof insertMediaAssetSchema>;
export type MediaAsset = typeof mediaAssets.$inferSelect;

// ============================================
// AI CHAT TABLES
// ============================================

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 100 }).notNull().unique(),
  visitorName: varchar("visitor_name", { length: 255 }),
  visitorEmail: varchar("visitor_email", { length: 255 }),
  visitorPhone: varchar("visitor_phone", { length: 50 }),
  visitorCompany: varchar("visitor_company", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  leadCaptured: boolean("lead_captured").default(false),
  messageCount: integer("message_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 100 }).notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatLeads = pgTable("chat_leads", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  interest: text("interest"),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Chat sessions schemas
export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectChatSessionSchema = createSelectSchema(chatSessions);
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;

// Chat messages schemas
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});
export const selectChatMessageSchema = createSelectSchema(chatMessages);
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Chat leads schemas
export const insertChatLeadSchema = createInsertSchema(chatLeads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectChatLeadSchema = createSelectSchema(chatLeads);
export type InsertChatLead = z.infer<typeof insertChatLeadSchema>;
export type ChatLead = typeof chatLeads.$inferSelect;

// ============================================
// PAGE VIEWS (ANALYTICS) TABLE
// ============================================
export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  pagePath: varchar("page_path", { length: 500 }).notNull(),
  pageTitle: varchar("page_title", { length: 255 }),
  sessionId: varchar("session_id", { length: 100 }),
  userId: integer("user_id"),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 50 }),
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 100 }),
  deviceType: varchar("device_type", { length: 50 }),
  browser: varchar("browser", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Page views schemas
export const insertPageViewSchema = createInsertSchema(pageViews).omit({
  id: true,
  createdAt: true,
});
export const selectPageViewSchema = createSelectSchema(pageViews);
export type InsertPageView = z.infer<typeof insertPageViewSchema>;
export type PageView = typeof pageViews.$inferSelect;

// ============================================
// UPLOAD JOBS TABLE (Background Processing)
// ============================================
export const uploadJobs = pgTable("upload_jobs", {
  id: serial("id").primaryKey(),
  jobType: varchar("job_type", { length: 50 }).notNull(), // 'product_import' | 'google_price_import'
  fileName: varchar("file_name", { length: 255 }).notNull(),
  uploadedByUserId: integer("uploaded_by_user_id").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending' | 'processing' | 'completed' | 'failed'
  totalRows: integer("total_rows").default(0),
  processedRows: integer("processed_rows").default(0),
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  skippedCount: integer("skipped_count").default(0),
  summaryMessage: text("summary_message"),
  errorDetails: text("error_details"), // JSON string of failed rows for download
  queuedAt: timestamp("queued_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
});

// Upload jobs schemas
export const insertUploadJobSchema = createInsertSchema(uploadJobs).omit({
  id: true,
  queuedAt: true,
});
export const selectUploadJobSchema = createSelectSchema(uploadJobs);
export type InsertUploadJob = z.infer<typeof insertUploadJobSchema>;
export type UploadJob = typeof uploadJobs.$inferSelect;

// ============================================
// AI CATEGORY REVIEW TABLE (Tracks AI-reviewed products)
// ============================================
export const aiCategoryReviews = pgTable("ai_category_reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  previousCategoryId: integer("previous_category_id"),
  previousSubcategoryId: integer("previous_subcategory_id"),
  newCategoryId: integer("new_category_id"),
  newSubcategoryId: integer("new_subcategory_id"),
  confidence: decimal("confidence", { precision: 3, scale: 2 }), // 0.00 to 1.00
  aiReasoning: text("ai_reasoning"),
  changesMade: boolean("changes_made").default(false),
  status: varchar("status", { length: 20 }).notNull().default("completed"), // 'completed' | 'skipped' | 'error'
  reviewedAt: timestamp("reviewed_at").defaultNow().notNull(),
});

// AI category reviews schemas
export const insertAiCategoryReviewSchema = createInsertSchema(aiCategoryReviews).omit({
  id: true,
  reviewedAt: true,
});
export const selectAiCategoryReviewSchema = createSelectSchema(aiCategoryReviews);
export type InsertAiCategoryReview = z.infer<typeof insertAiCategoryReviewSchema>;
export type AiCategoryReview = typeof aiCategoryReviews.$inferSelect;

// ============================================
// CATEGORY ALIASES TABLE (Maps variant names to canonical categories)
// ============================================
export const categoryAliases = pgTable("category_aliases", {
  id: serial("id").primaryKey(),
  aliasName: varchar("alias_name", { length: 255 }).notNull().unique(), // e.g., "Skin Care" - unique to prevent duplicates
  canonicalCategoryId: integer("canonical_category_id").notNull(), // e.g., ID of "Skincare"
  isSubcategory: boolean("is_subcategory").default(false),
  discoveredBy: varchar("discovered_by", { length: 50 }).default("ai"), // 'ai' | 'admin'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Category aliases schemas
export const insertCategoryAliasSchema = createInsertSchema(categoryAliases).omit({
  id: true,
  createdAt: true,
});
export const selectCategoryAliasSchema = createSelectSchema(categoryAliases);
export type InsertCategoryAlias = z.infer<typeof insertCategoryAliasSchema>;
export type CategoryAlias = typeof categoryAliases.$inferSelect;

// ============================================
// AI CATEGORY AGENT STATUS TABLE (Tracks background agent state)
// ============================================
export const aiCategoryAgentStatus = pgTable("ai_category_agent_status", {
  id: serial("id").primaryKey(),
  isRunning: boolean("is_running").default(false),
  lastRunAt: timestamp("last_run_at"),
  totalProductsProcessed: integer("total_products_processed").default(0),
  totalChanges: integer("total_changes").default(0),
  lastProductId: integer("last_product_id").default(0), // For resuming from where we left off
  errorCount: integer("error_count").default(0),
  lastError: text("last_error"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI category agent status schemas
export const insertAiCategoryAgentStatusSchema = createInsertSchema(aiCategoryAgentStatus).omit({
  id: true,
  updatedAt: true,
});
export const selectAiCategoryAgentStatusSchema = createSelectSchema(aiCategoryAgentStatus);
export type InsertAiCategoryAgentStatus = z.infer<typeof insertAiCategoryAgentStatusSchema>;
export type AiCategoryAgentStatus = typeof aiCategoryAgentStatus.$inferSelect;

// ============================================
// SEO AGENT STATUS TABLE (Tracks SEO optimization agent state)
// ============================================
export const seoAgentStatus = pgTable("seo_agent_status", {
  id: serial("id").primaryKey(),
  isRunning: boolean("is_running").default(false),
  lastRunAt: timestamp("last_run_at"),
  nextScheduledRun: timestamp("next_scheduled_run"),
  totalProductsOptimized: integer("total_products_optimized").default(0),
  totalBrandsOptimized: integer("total_brands_optimized").default(0),
  totalCategoriesOptimized: integer("total_categories_optimized").default(0),
  totalPagesOptimized: integer("total_pages_optimized").default(0),
  currentTask: text("current_task"),
  errorCount: integer("error_count").default(0),
  lastError: text("last_error"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// SEO agent status schemas
export const insertSeoAgentStatusSchema = createInsertSchema(seoAgentStatus).omit({
  id: true,
  updatedAt: true,
});
export const selectSeoAgentStatusSchema = createSelectSchema(seoAgentStatus);
export type InsertSeoAgentStatus = z.infer<typeof insertSeoAgentStatusSchema>;
export type SeoAgentStatus = typeof seoAgentStatus.$inferSelect;

// ============================================
// SEO AGENT ACTIONS LOG TABLE (Tracks all SEO optimizations performed)
// ============================================
export const seoAgentActions = pgTable("seo_agent_actions", {
  id: serial("id").primaryKey(),
  actionType: varchar("action_type", { length: 50 }).notNull(), // 'product_seo', 'brand_seo', 'category_seo', 'page_seo', 'schema_markup', 'keyword_optimization'
  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'product', 'brand', 'category', 'page'
  entityId: integer("entity_id"),
  entityName: varchar("entity_name", { length: 500 }),
  previousValue: text("previous_value"), // JSON of previous SEO values
  newValue: text("new_value"), // JSON of new SEO values
  aiReasoning: text("ai_reasoning"), // Why the AI made this change
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }),
  status: varchar("status", { length: 20 }).default("completed"), // 'pending', 'completed', 'failed', 'skipped'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// SEO agent actions schemas
export const insertSeoAgentActionSchema = createInsertSchema(seoAgentActions).omit({
  id: true,
  createdAt: true,
});
export const selectSeoAgentActionSchema = createSelectSchema(seoAgentActions);
export type InsertSeoAgentAction = z.infer<typeof insertSeoAgentActionSchema>;
export type SeoAgentAction = typeof seoAgentActions.$inferSelect;

// ============================================
// SEO RECOMMENDATIONS TABLE (AI-generated improvement suggestions)
// ============================================
export const seoRecommendations = pgTable("seo_recommendations", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'product', 'brand', 'category', 'page', 'site'
  entityId: integer("entity_id"),
  entityName: varchar("entity_name", { length: 500 }),
  recommendationType: varchar("recommendation_type", { length: 100 }).notNull(), // 'missing_meta', 'short_description', 'keyword_opportunity', 'internal_linking', 'duplicate_content'
  priority: varchar("priority", { length: 20 }).default("medium"), // 'high', 'medium', 'low'
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  suggestedAction: text("suggested_action"),
  potentialImpact: varchar("potential_impact", { length: 100 }), // 'high_traffic', 'medium_traffic', 'low_traffic'
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'applied', 'dismissed', 'in_progress'
  appliedAt: timestamp("applied_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// SEO recommendations schemas
export const insertSeoRecommendationSchema = createInsertSchema(seoRecommendations).omit({
  id: true,
  createdAt: true,
});
export const selectSeoRecommendationSchema = createSelectSchema(seoRecommendations);
export type InsertSeoRecommendation = z.infer<typeof insertSeoRecommendationSchema>;
export type SeoRecommendation = typeof seoRecommendations.$inferSelect;

// ============================================
// IMPORT JOBS TABLE (for background CSV processing)
// ============================================
export const importJobs = pgTable("import_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  filename: varchar("filename", { length: 500 }).notNull(),
  totalRows: integer("total_rows").notNull().default(0),
  processedRows: integer("processed_rows").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("queued"), // 'queued', 'processing', 'completed', 'failed', 'cancelled'
  errorSummary: text("error_summary"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertImportJobSchema = createInsertSchema(importJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectImportJobSchema = createSelectSchema(importJobs);
export type InsertImportJob = z.infer<typeof insertImportJobSchema>;
export type ImportJob = typeof importJobs.$inferSelect;

// ============================================
// IMPORT JOB LINES TABLE (per-row tracking)
// ============================================
export const importJobLines = pgTable("import_job_lines", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  rowNumber: integer("row_number").notNull(),
  payload: text("payload").notNull(), // JSON of original CSV row
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'success', 'error', 'skipped'
  errorMessage: text("error_message"),
  productId: integer("product_id"), // ID of created/updated product if successful
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertImportJobLineSchema = createInsertSchema(importJobLines).omit({
  id: true,
  createdAt: true,
});
export const selectImportJobLineSchema = createSelectSchema(importJobLines);
export type InsertImportJobLine = z.infer<typeof insertImportJobLineSchema>;
export type ImportJobLine = typeof importJobLines.$inferSelect;

// ============================================
// FORM VALIDATION SCHEMAS
// ============================================

// Customer registration validation schema
export const customerRegistrationSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  businessType: z.string().min(1, "Business type is required"),
  companyName: z.string().min(1, "Company name is required"),
  tradingName: z.string().optional(),
  gphcNumber: z.string().optional(),
  companyRegistrationNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  primaryContactName: z.string().min(1, "Contact name is required"),
  jobTitle: z.string().optional(),
  phoneNumber: z.string().min(1, "Phone number is required"),
  mobileNumber: z.string().optional(),
  billingAddressLine1: z.string().min(1, "Billing address is required"),
  billingAddressLine2: z.string().optional(),
  billingCity: z.string().min(1, "City is required"),
  billingPostcode: z.string().min(1, "Postcode is required"),
  billingCountry: z.string().default("United Kingdom"),
  deliverySameAsBilling: z.boolean().default(true),
  deliveryAddressLine1: z.string().optional(),
  deliveryAddressLine2: z.string().optional(),
  deliveryCity: z.string().optional(),
  deliveryPostcode: z.string().optional(),
  deliveryCountry: z.string().optional(),
  mhraLicenceType: z.string().optional(),
  mhraLicenceNumber: z.string().optional(),
  responsiblePersonName: z.string().optional(),
  responsiblePersonEmail: z.string().email().optional().or(z.literal("")),
  coldChainCapability: z.boolean().default(false),
  interestedInControlledProducts: z.boolean().default(false),
  estimatedMonthlySpend: z.string().optional(),
  orderingContactEmail: z.string().email().optional().or(z.literal("")),
  accountsPayableEmail: z.string().email().optional().or(z.literal("")),
  preferredOrderMethod: z.string().optional(),
  howDidYouHear: z.string().optional(),
  notes: z.string().optional(),
  marketingConsent: z.boolean().default(false),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type CustomerRegistrationData = z.infer<typeof customerRegistrationSchema>;

// Supplier registration validation schema
export const supplierRegistrationSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  tradingName: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  country: z.string().min(1, "Country is required"),
  businessType: z.string().min(1, "Business type is required"),
  contactName: z.string().min(1, "Contact name is required"),
  jobTitle: z.string().optional(),
  email: z.string().email("Valid email is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  mhraGdpLicences: z.string().optional(),
  gdpAccredited: z.boolean().default(false),
  productCategoriesSupply: z.string().min(1, "Product categories are required"),
  brandNamesRepresent: z.string().min(1, "Brand names are required"),
  licensedUkEu: z.string().optional(),
  exclusivityInterest: z.boolean().default(false),
  stockLocations: z.string().optional(),
  minimumOrderQuantities: z.string().optional(),
  logisticsCapability: z.string().optional(),
  proposalSummary: z.string().min(1, "Proposal summary is required"),
  additionalNotes: z.string().optional(),
  marketingConsent: z.boolean().default(false),
});

export type SupplierRegistrationData = z.infer<typeof supplierRegistrationSchema>;

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginData = z.infer<typeof loginSchema>;

// Contact form schema
export const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
  privacyConsent: z.boolean().refine((val) => val === true, {
    message: "You must agree to our Privacy Policy to submit this form",
  }),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

// ============================================
// OFFERS TABLE (Monthly promotional campaigns)
// ============================================
export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  heroImageUrl: text("hero_image_url"),
  heroTitle: varchar("hero_title", { length: 255 }),
  heroSubtitle: text("hero_subtitle"),
  displayStyle: varchar("display_style", { length: 50 }).default("grid"),
  badgeText: varchar("badge_text", { length: 50 }).default("OFFER"),
  badgeColor: varchar("badge_color", { length: 20 }).default("red"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Offer = typeof offers.$inferSelect;

// ============================================
// OFFER ITEMS TABLE (Products within an offer)
// ============================================
export const offerItems = pgTable("offer_items", {
  id: serial("id").primaryKey(),
  offerId: integer("offer_id").notNull(),
  productId: integer("product_id").notNull(),
  offerPrice: decimal("offer_price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  discountLabel: varchar("discount_label", { length: 100 }),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOfferItemSchema = createInsertSchema(offerItems).omit({
  id: true,
  createdAt: true,
});
export type InsertOfferItem = z.infer<typeof insertOfferItemSchema>;
export type OfferItem = typeof offerItems.$inferSelect;

// ============================================
// PRODUCT POPULARITY TABLE (Analytics for intelligent sorting)
// ============================================
export const productPopularity = pgTable("product_popularity", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  viewCount: integer("view_count").default(0),
  quoteAddCount: integer("quote_add_count").default(0),
  conversionCount: integer("conversion_count").default(0),
  popularityScore: decimal("popularity_score", { precision: 10, scale: 2 }).default("0"),
  lastViewedAt: timestamp("last_viewed_at"),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProductPopularitySchema = createInsertSchema(productPopularity).omit({
  id: true,
  createdAt: true,
});
export type InsertProductPopularity = z.infer<typeof insertProductPopularitySchema>;
export type ProductPopularity = typeof productPopularity.$inferSelect;

// ============================================
// FEATURED ROTATION TABLE (Daily featured product selection)
// ============================================
export const featuredRotation = pgTable("featured_rotation", {
  id: serial("id").primaryKey(),
  rotationDate: varchar("rotation_date", { length: 10 }).notNull(), // YYYY-MM-DD format
  productIds: text("product_ids").notNull(), // JSON array of product IDs
  selectionCriteria: text("selection_criteria"), // JSON with criteria used
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFeaturedRotationSchema = createInsertSchema(featuredRotation).omit({
  id: true,
  createdAt: true,
});
export type InsertFeaturedRotation = z.infer<typeof insertFeaturedRotationSchema>;
export type FeaturedRotation = typeof featuredRotation.$inferSelect;
