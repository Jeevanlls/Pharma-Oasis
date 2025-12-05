import { db } from "./db";
import { users, brands, categories, products, siteSettings, cmsBlocks } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Starting database seed...");

  // Create admin user
  const existingAdmin = await db.select().from(users).where(eq(users.email, "admin@pharmaoasis.com"));
  
  if (existingAdmin.length === 0) {
    const passwordHash = await bcrypt.hash("Admin!234", 10);
    await db.insert(users).values({
      email: "admin@pharmaoasis.com",
      passwordHash,
      role: "admin",
      status: "active",
      companyName: "Pharma Oasis Admin",
      primaryContactName: "System Administrator",
      phoneNumber: "+44 20 1234 5678",
      billingAddressLine1: "123 Healthcare Way",
      billingCity: "London",
      billingPostcode: "EC1A 1BB",
      billingCountry: "United Kingdom",
    });
    console.log("Admin user created: admin@pharmaoasis.com / Admin!234");
  } else {
    console.log("Admin user already exists");
  }

  // Create sample brands
  const brandData = [
    { name: "PharmaCare Plus", description: "Premium pharmaceutical products for everyday health", isDirectDistributor: true, isActive: true },
    { name: "WellnessFirst", description: "Leading wellness and supplement brand", isDirectDistributor: true, isActive: true },
    { name: "MediCore", description: "Hospital-grade medical supplies and devices", isDirectDistributor: false, isActive: true },
    { name: "HealthGuard", description: "First aid and wound care specialists", isDirectDistributor: false, isActive: true },
    { name: "VitaBoost", description: "Vitamins and nutritional supplements", isDirectDistributor: false, isActive: true },
    { name: "DermaSkin", description: "Professional skincare and dermatology products", isDirectDistributor: true, isActive: true },
    { name: "OralCare Pro", description: "Dental and oral hygiene products", isDirectDistributor: false, isActive: true },
    { name: "CardioHealth", description: "Cardiovascular health monitoring devices", isDirectDistributor: false, isActive: true },
  ];

  for (const brand of brandData) {
    const existing = await db.select().from(brands).where(eq(brands.name, brand.name));
    if (existing.length === 0) {
      await db.insert(brands).values(brand);
      console.log(`Brand created: ${brand.name}`);
    }
  }

  // Create sample categories
  const categoryData = [
    { name: "Pharmaceuticals", description: "Prescription and licensed medicines", parentId: null },
    { name: "OTC Medicines", description: "Over-the-counter medicines and treatments", parentId: null },
    { name: "Vitamins & Supplements", description: "Nutritional supplements and vitamins", parentId: null },
    { name: "First Aid", description: "First aid supplies and wound care", parentId: null },
    { name: "Medical Devices", description: "Medical equipment and monitoring devices", parentId: null },
    { name: "Skincare", description: "Dermatology and skincare products", parentId: null },
    { name: "Oral Care", description: "Dental and oral hygiene products", parentId: null },
    { name: "Baby & Child", description: "Paediatric health products", parentId: null },
  ];

  const createdCategories: Record<string, number> = {};
  
  for (const category of categoryData) {
    const existing = await db.select().from(categories).where(eq(categories.name, category.name));
    if (existing.length === 0) {
      const [created] = await db.insert(categories).values({
        name: category.name,
        description: category.description,
        parentId: category.parentId,
        isActive: true,
      }).returning();
      createdCategories[category.name] = created.id;
      console.log(`Category created: ${category.name}`);
    } else {
      createdCategories[category.name] = existing[0].id;
    }
  }

  // Add some subcategories
  const subcategoryData = [
    { name: "Pain Relief", parentName: "OTC Medicines" },
    { name: "Cold & Flu", parentName: "OTC Medicines" },
    { name: "Digestive Health", parentName: "OTC Medicines" },
    { name: "Allergy Relief", parentName: "OTC Medicines" },
    { name: "Multivitamins", parentName: "Vitamins & Supplements" },
    { name: "Omega 3 & Fish Oils", parentName: "Vitamins & Supplements" },
    { name: "Probiotics", parentName: "Vitamins & Supplements" },
    { name: "Bandages & Dressings", parentName: "First Aid" },
    { name: "Antiseptics", parentName: "First Aid" },
    { name: "Blood Pressure Monitors", parentName: "Medical Devices" },
    { name: "Glucose Monitors", parentName: "Medical Devices" },
    { name: "Moisturisers", parentName: "Skincare" },
    { name: "Acne Treatment", parentName: "Skincare" },
  ];

  for (const subcategory of subcategoryData) {
    const parentId = createdCategories[subcategory.parentName];
    if (parentId) {
      const existing = await db.select().from(categories).where(eq(categories.name, subcategory.name));
      if (existing.length === 0) {
        const [created] = await db.insert(categories).values({
          name: subcategory.name,
          parentId,
          isActive: true,
        }).returning();
        createdCategories[subcategory.name] = created.id;
        console.log(`Subcategory created: ${subcategory.name}`);
      } else {
        createdCategories[subcategory.name] = existing[0].id;
      }
    }
  }

  // Get brand IDs
  const allBrands = await db.select().from(brands);
  const brandMap: Record<string, number> = {};
  for (const brand of allBrands) {
    brandMap[brand.name] = brand.id;
  }

  // Create sample products
  const productData = [
    { sku: "PC-IBU-400", productName: "Ibuprofen 400mg Tablets", brandName: "PharmaCare Plus", categoryName: "Pain Relief", wholesalePrice: "2.50", rrp: "4.99", packSize: "32 tablets", moq: 12, isFeatured: true },
    { sku: "PC-PAR-500", productName: "Paracetamol 500mg Caplets", brandName: "PharmaCare Plus", categoryName: "Pain Relief", wholesalePrice: "1.80", rrp: "3.49", packSize: "100 tablets", moq: 24, isFeatured: false },
    { sku: "WF-VITA-MV", productName: "Complete Multivitamin A-Z", brandName: "WellnessFirst", categoryName: "Multivitamins", wholesalePrice: "4.20", rrp: "8.99", packSize: "60 tablets", moq: 12, isFeatured: true },
    { sku: "WF-OMG3-1K", productName: "Omega 3 Fish Oil 1000mg", brandName: "WellnessFirst", categoryName: "Omega 3 & Fish Oils", wholesalePrice: "5.50", rrp: "12.99", packSize: "90 softgels", moq: 12, isFeatured: true },
    { sku: "MC-FA-BURN", productName: "Professional Burn Dressing Pad", brandName: "MediCore", categoryName: "Bandages & Dressings", wholesalePrice: "3.20", rrp: "6.99", packSize: "Pack of 5", moq: 10, isFeatured: false },
    { sku: "HG-BAND-AST", productName: "Assorted Plaster Pack", brandName: "HealthGuard", categoryName: "Bandages & Dressings", wholesalePrice: "1.50", rrp: "3.29", packSize: "40 plasters", moq: 24, isFeatured: false },
    { sku: "VB-VITD-1K", productName: "Vitamin D3 1000IU Tablets", brandName: "VitaBoost", categoryName: "Multivitamins", wholesalePrice: "2.80", rrp: "5.99", packSize: "180 tablets", moq: 12, isFeatured: true },
    { sku: "VB-PROB-30", productName: "Daily Probiotic 30 Billion CFU", brandName: "VitaBoost", categoryName: "Probiotics", wholesalePrice: "6.50", rrp: "14.99", packSize: "30 capsules", moq: 12, isFeatured: true },
    { sku: "DS-MOIST-50", productName: "Intensive Moisturising Cream", brandName: "DermaSkin", categoryName: "Moisturisers", wholesalePrice: "7.80", rrp: "15.99", packSize: "50ml", moq: 6, isFeatured: true },
    { sku: "DS-ACNE-GEL", productName: "Clear Skin Acne Gel", brandName: "DermaSkin", categoryName: "Acne Treatment", wholesalePrice: "5.20", rrp: "11.99", packSize: "30ml", moq: 12, isFeatured: false },
    { sku: "OP-TOOTH-T", productName: "Professional Toothpaste", brandName: "OralCare Pro", categoryName: "Oral Care", wholesalePrice: "2.10", rrp: "4.49", packSize: "100ml", moq: 24, isFeatured: false },
    { sku: "CH-BPM-AUTO", productName: "Automatic Blood Pressure Monitor", brandName: "CardioHealth", categoryName: "Blood Pressure Monitors", wholesalePrice: "18.50", rrp: "39.99", packSize: "1 unit", moq: 4, isFeatured: true },
    { sku: "CH-GLU-KIT", productName: "Blood Glucose Test Kit", brandName: "CardioHealth", categoryName: "Glucose Monitors", wholesalePrice: "12.00", rrp: "24.99", packSize: "1 unit + 50 strips", moq: 6, isFeatured: false },
    { sku: "PC-COLD-TAB", productName: "Cold & Flu Relief Tablets", brandName: "PharmaCare Plus", categoryName: "Cold & Flu", wholesalePrice: "3.20", rrp: "6.99", packSize: "24 tablets", moq: 12, isFeatured: false },
    { sku: "PC-ALLER-TAB", productName: "Antihistamine Allergy Tablets", brandName: "PharmaCare Plus", categoryName: "Allergy Relief", wholesalePrice: "2.80", rrp: "5.99", packSize: "30 tablets", moq: 12, isFeatured: false },
    { sku: "HG-ANTISEP", productName: "Antiseptic Wound Spray", brandName: "HealthGuard", categoryName: "Antiseptics", wholesalePrice: "3.50", rrp: "7.49", packSize: "100ml", moq: 12, isFeatured: false },
  ];

  for (const product of productData) {
    const brandId = brandMap[product.brandName];
    const categoryId = createdCategories[product.categoryName];
    
    if (brandId && categoryId) {
      const existing = await db.select().from(products).where(eq(products.sku, product.sku));
      if (existing.length === 0) {
        await db.insert(products).values({
          sku: product.sku,
          productName: product.productName,
          brandId,
          categoryId,
          wholesalePrice: product.wholesalePrice,
          rrp: product.rrp,
          packSize: product.packSize,
          moq: product.moq,
          isFeatured: product.isFeatured,
          isActive: true,
          uom: "each",
          vatRate: "0.20",
        });
        console.log(`Product created: ${product.productName}`);
      }
    }
  }

  // Create default site settings
  const settingsData = [
    { key: "site_name", value: "Pharma Oasis", description: "Website name" },
    { key: "site_tagline", value: "Your Wholesale Healthcare Partner", description: "Website tagline" },
    { key: "contact_email", value: "info@pharmaoasis.com", description: "Main contact email" },
    { key: "contact_phone", value: "+44 (0) 20 1234 5678", description: "Main contact phone" },
    { key: "active_theme", value: "theme_clinical_blue", description: "Active theme (theme_clinical_blue, theme_premium_offwhite, theme_tech_slate)" },
  ];

  for (const setting of settingsData) {
    const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, setting.key));
    if (existing.length === 0) {
      await db.insert(siteSettings).values(setting);
      console.log(`Setting created: ${setting.key}`);
    }
  }

  // Create default CMS blocks
  const cmsData = [
    { key: "homepage_hero_title", section: "homepage", content: "Your Wholesale Partner for Healthcare Excellence", contentType: "text" },
    { key: "homepage_hero_subtitle", section: "homepage", content: "Access 20,000+ healthcare products at competitive wholesale prices. Pharma Oasis is a licensed distributor trusted by pharmacies across the United Kingdom.", contentType: "text" },
    { key: "about_company", section: "about", content: "Pharma Oasis is a leading UK healthcare wholesaler, supplying over 3,000 pharmacies nationwide with pharmaceutical, wellness, and beauty products. We are MHRA licensed and GDP compliant.", contentType: "text" },
  ];

  for (const block of cmsData) {
    const existing = await db.select().from(cmsBlocks).where(eq(cmsBlocks.key, block.key));
    if (existing.length === 0) {
      await db.insert(cmsBlocks).values(block);
      console.log(`CMS block created: ${block.key}`);
    }
  }

  console.log("Database seed completed!");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  });
