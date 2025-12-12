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
