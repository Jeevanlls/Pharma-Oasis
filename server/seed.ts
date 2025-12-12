import { db } from "./db";
import { users, brands, categories, products, siteSettings, cmsBlocks, heroSlides, companyLocations, homeStats, homeFeatures, homeCategories, homeProcessSteps, homeSections } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export async function seed() {
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

  // Create sample brands - Real UK pharmaceutical and healthcare brands
  const brandData = [
    // Major UK OTC Medicine Brands
    { name: "Nurofen", description: "Leading ibuprofen-based pain relief brand - trusted for headaches, muscle pain and fever", isDirectDistributor: true, isActive: true, logoUrl: "https://placehold.co/200x60/e63946/ffffff?text=Nurofen&font=montserrat", isHomeFeatured: true, homePosition: 1 },
    { name: "Panadol", description: "Trusted paracetamol brand for effective pain relief", isDirectDistributor: true, isActive: true, logoUrl: "https://placehold.co/200x60/0077b6/ffffff?text=Panadol&font=montserrat", isHomeFeatured: true, homePosition: 2 },
    { name: "Calpol", description: "UK's most trusted children's paracetamol brand since 1972", isDirectDistributor: true, isActive: true, logoUrl: "https://placehold.co/200x60/9c27b0/ffffff?text=Calpol&font=montserrat", isHomeFeatured: true, homePosition: 3 },
    { name: "Lemsip", description: "Cold and flu remedies - fighting cold symptoms for over 50 years", isDirectDistributor: true, isActive: true, logoUrl: "https://placehold.co/200x60/ff9800/ffffff?text=Lemsip&font=montserrat", isHomeFeatured: true, homePosition: 4 },
    { name: "Strepsils", description: "Sore throat lozenges - the UK's leading throat care brand", isDirectDistributor: true, isActive: true, logoUrl: "https://placehold.co/200x60/f44336/ffffff?text=Strepsils&font=montserrat", isHomeFeatured: true, homePosition: 5 },
    { name: "Gaviscon", description: "Heartburn and indigestion relief - fast-acting antacid", isDirectDistributor: true, isActive: true, logoUrl: "https://placehold.co/200x60/4caf50/ffffff?text=Gaviscon&font=montserrat", isHomeFeatured: true, homePosition: 6 },
    { name: "Rennie", description: "Fast-acting antacid tablets for heartburn and indigestion", isDirectDistributor: false, isActive: true, logoUrl: "https://placehold.co/200x60/2196f3/ffffff?text=Rennie&font=montserrat", isHomeFeatured: true, homePosition: 7 },
    { name: "Imodium", description: "Diarrhoea relief - get back to normal faster", isDirectDistributor: false, isActive: true, logoUrl: "https://placehold.co/200x60/009688/ffffff?text=Imodium&font=montserrat", isHomeFeatured: true, homePosition: 8 },
    { name: "Benylin", description: "Cough and cold remedies for all the family", isDirectDistributor: true, isActive: true, logoUrl: "https://placehold.co/200x60/673ab7/ffffff?text=Benylin&font=montserrat", isHomeFeatured: true, homePosition: 9 },
    { name: "Berocca", description: "Effervescent vitamin tablets for energy support", isDirectDistributor: false, isActive: true, logoUrl: "https://placehold.co/200x60/ff5722/ffffff?text=Berocca&font=montserrat", isHomeFeatured: true, homePosition: 10 },
    // Additional pharmaceutical brands
    { name: "Piriteze", description: "Allergy relief - one-a-day antihistamines", isDirectDistributor: false, isActive: true, logoUrl: "https://placehold.co/200x60/3f51b5/ffffff?text=Piriteze&font=montserrat", isHomeFeatured: false, homePosition: null },
    { name: "Piriton", description: "Fast-acting chlorphenamine antihistamine tablets", isDirectDistributor: false, isActive: true, logoUrl: "https://placehold.co/200x60/00bcd4/ffffff?text=Piriton&font=montserrat", isHomeFeatured: false, homePosition: null },
    { name: "Anbesol", description: "Teething gel and mouth ulcer treatment", isDirectDistributor: false, isActive: true, logoUrl: "https://placehold.co/200x60/795548/ffffff?text=Anbesol&font=montserrat", isHomeFeatured: false, homePosition: null },
    { name: "Bonjela", description: "Mouth ulcer and teething gel treatment", isDirectDistributor: false, isActive: true, logoUrl: "https://placehold.co/200x60/e91e63/ffffff?text=Bonjela&font=montserrat", isHomeFeatured: false, homePosition: null },
    { name: "Sudocrem", description: "Nappy rash cream and healing ointment", isDirectDistributor: true, isActive: true, logoUrl: "https://placehold.co/200x60/9e9e9e/ffffff?text=Sudocrem&font=montserrat", isHomeFeatured: false, homePosition: null },
    { name: "Bepanthen", description: "Nappy care ointment with provitamin B5", isDirectDistributor: false, isActive: true, logoUrl: "https://placehold.co/200x60/00acc1/ffffff?text=Bepanthen&font=montserrat", isHomeFeatured: false, homePosition: null },
    { name: "Infacol", description: "Colic relief drops for babies", isDirectDistributor: false, isActive: true, logoUrl: "https://placehold.co/200x60/8bc34a/ffffff?text=Infacol&font=montserrat", isHomeFeatured: false, homePosition: null },
    { name: "Dentinox", description: "Teething gel and colic drops for infants", isDirectDistributor: false, isActive: true, logoUrl: "https://placehold.co/200x60/ffc107/333333?text=Dentinox&font=montserrat", isHomeFeatured: false, homePosition: null },
    // Vitamins & Supplements brands
    { name: "Seven Seas", description: "Omega-3 and vitamin specialists since 1935", isDirectDistributor: true, isActive: true, logoUrl: "https://placehold.co/200x60/0077b6/ffffff?text=Seven+Seas&font=montserrat", isHomeFeatured: false, homePosition: null },
    { name: "Vitabiotics", description: "UK's No.1 vitamin company - Wellman, Wellwoman, Pregnacare", isDirectDistributor: true, isActive: true, logoUrl: "https://placehold.co/200x60/e63946/ffffff?text=Vitabiotics&font=montserrat", isHomeFeatured: false, homePosition: null },
    { name: "Centrum", description: "Complete A-Z multivitamin range", isDirectDistributor: true, isActive: true, logoUrl: "https://placehold.co/200x60/1976d2/ffffff?text=Centrum&font=montserrat", isHomeFeatured: false, homePosition: null },
    { name: "Solgar", description: "Premium quality vitamins and supplements since 1947", isDirectDistributor: false, isActive: true, logoUrl: "https://placehold.co/200x60/9b2335/ffd700?text=Solgar&font=montserrat", isHomeFeatured: false, homePosition: null },
    { name: "Floradix", description: "Natural iron and vitamin supplements - liquid iron formula", isDirectDistributor: false, isActive: true, logoUrl: "https://placehold.co/200x60/780000/ffffff?text=Floradix&font=montserrat", isHomeFeatured: false, homePosition: null },
    // Skincare brands
    { name: "E45", description: "Dermatological skincare for dry and sensitive skin", isDirectDistributor: true, isActive: true, logoUrl: "https://placehold.co/200x60/81c784/ffffff?text=E45&font=montserrat", isHomeFeatured: false, homePosition: null },
    { name: "CeraVe", description: "Developed with dermatologists - ceramide skincare", isDirectDistributor: true, isActive: true, logoUrl: "https://placehold.co/200x60/0d47a1/ffffff?text=CeraVe&font=montserrat", isHomeFeatured: false, homePosition: null },
    { name: "La Roche-Posay", description: "French dermatological skincare brand", isDirectDistributor: false, isActive: true, logoUrl: "https://placehold.co/200x60/1565c0/ffffff?text=LRP&font=montserrat", isHomeFeatured: false, homePosition: null },
    { name: "Simple", description: "Sensitive skin specialists - kind to skin", isDirectDistributor: true, isActive: true, logoUrl: "https://placehold.co/200x60/a8dadc/1d3557?text=Simple&font=montserrat", isHomeFeatured: false, homePosition: null },
    { name: "Nivea", description: "Trusted skincare and body care since 1911", isDirectDistributor: true, isActive: true, logoUrl: "https://placehold.co/200x60/1a237e/ffffff?text=Nivea&font=montserrat", isHomeFeatured: false, homePosition: null },
    // Oral care brands
    { name: "Sensodyne", description: "Sensitivity relief toothpaste - for sensitive teeth", isDirectDistributor: true, isActive: true, logoUrl: "https://placehold.co/200x60/0288d1/ffffff?text=Sensodyne&font=montserrat", isHomeFeatured: false, homePosition: null },
    { name: "Corsodyl", description: "Gum care and treatment products", isDirectDistributor: false, isActive: true, logoUrl: "https://placehold.co/200x60/c62828/ffffff?text=Corsodyl&font=montserrat", isHomeFeatured: false, homePosition: null },
    { name: "Colgate", description: "Oral care products - toothpaste and mouthwash", isDirectDistributor: true, isActive: true, logoUrl: "https://placehold.co/200x60/d32f2f/ffffff?text=Colgate&font=montserrat", isHomeFeatured: false, homePosition: null },
    // First aid brands
    { name: "Savlon", description: "Antiseptic creams, wipes and wound care", isDirectDistributor: false, isActive: true, logoUrl: "https://placehold.co/200x60/388e3c/ffffff?text=Savlon&font=montserrat", isHomeFeatured: false, homePosition: null },
    { name: "Dettol", description: "Antiseptic liquid and hygiene products", isDirectDistributor: true, isActive: true, logoUrl: "https://placehold.co/200x60/2e7d32/ffffff?text=Dettol&font=montserrat", isHomeFeatured: false, homePosition: null },
    { name: "Elastoplast", description: "Plasters, bandages and wound healing products", isDirectDistributor: true, isActive: true, logoUrl: "https://placehold.co/200x60/ef5350/ffffff?text=Elastoplast&font=montserrat", isHomeFeatured: false, homePosition: null },
    // Medical devices brands
    { name: "Omron", description: "Blood pressure monitors and health monitoring devices", isDirectDistributor: false, isActive: true, logoUrl: "https://placehold.co/200x60/263238/ffffff?text=Omron&font=montserrat", isHomeFeatured: false, homePosition: null },
    { name: "Accu-Chek", description: "Blood glucose monitoring systems for diabetes", isDirectDistributor: false, isActive: true, logoUrl: "https://placehold.co/200x60/ffb300/333333?text=Accu-Chek&font=montserrat", isHomeFeatured: false, homePosition: null },
  ];

  for (const brand of brandData) {
    const existing = await db.select().from(brands).where(eq(brands.name, brand.name));
    if (existing.length === 0) {
      await db.insert(brands).values(brand);
      console.log(`Brand created: ${brand.name}`);
    } else {
      // Update existing brands with logo URL and home featured settings
      await db.update(brands)
        .set({ 
          logoUrl: brand.logoUrl, 
          isHomeFeatured: brand.isHomeFeatured, 
          homePosition: brand.homePosition 
        })
        .where(eq(brands.name, brand.name));
      console.log(`Brand updated: ${brand.name}`);
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

  // Add comprehensive subcategories
  const subcategoryData = [
    // OTC Medicines subcategories
    { name: "Pain Relief", parentName: "OTC Medicines" },
    { name: "Cold & Flu", parentName: "OTC Medicines" },
    { name: "Cough & Sore Throat", parentName: "OTC Medicines" },
    { name: "Digestive Health", parentName: "OTC Medicines" },
    { name: "Heartburn & Indigestion", parentName: "OTC Medicines" },
    { name: "Allergy Relief", parentName: "OTC Medicines" },
    { name: "Eye Care", parentName: "OTC Medicines" },
    { name: "Sleep & Stress", parentName: "OTC Medicines" },
    // Vitamins & Supplements subcategories
    { name: "Multivitamins", parentName: "Vitamins & Supplements" },
    { name: "Omega 3 & Fish Oils", parentName: "Vitamins & Supplements" },
    { name: "Probiotics", parentName: "Vitamins & Supplements" },
    { name: "Vitamin D", parentName: "Vitamins & Supplements" },
    { name: "Vitamin C", parentName: "Vitamins & Supplements" },
    { name: "Iron Supplements", parentName: "Vitamins & Supplements" },
    { name: "Energy & Immunity", parentName: "Vitamins & Supplements" },
    { name: "Women's Health", parentName: "Vitamins & Supplements" },
    { name: "Men's Health", parentName: "Vitamins & Supplements" },
    // First Aid subcategories
    { name: "Bandages & Dressings", parentName: "First Aid" },
    { name: "Plasters", parentName: "First Aid" },
    { name: "Antiseptics", parentName: "First Aid" },
    { name: "Burns & Scalds", parentName: "First Aid" },
    // Medical Devices subcategories
    { name: "Blood Pressure Monitors", parentName: "Medical Devices" },
    { name: "Glucose Monitors", parentName: "Medical Devices" },
    { name: "Thermometers", parentName: "Medical Devices" },
    { name: "Pulse Oximeters", parentName: "Medical Devices" },
    // Skincare subcategories
    { name: "Moisturisers", parentName: "Skincare" },
    { name: "Acne Treatment", parentName: "Skincare" },
    { name: "Dry Skin", parentName: "Skincare" },
    { name: "Eczema & Psoriasis", parentName: "Skincare" },
    { name: "Sun Care", parentName: "Skincare" },
    // Oral Care subcategories
    { name: "Toothpaste", parentName: "Oral Care" },
    { name: "Mouthwash", parentName: "Oral Care" },
    { name: "Mouth Ulcers", parentName: "Oral Care" },
    { name: "Denture Care", parentName: "Oral Care" },
    // Baby & Child subcategories
    { name: "Baby Pain Relief", parentName: "Baby & Child" },
    { name: "Nappy Rash", parentName: "Baby & Child" },
    { name: "Teething", parentName: "Baby & Child" },
    { name: "Colic Relief", parentName: "Baby & Child" },
    { name: "Baby Vitamins", parentName: "Baby & Child" },
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

  // Create comprehensive real UK pharmaceutical products with images
  // Format: parentCategory = top level (OTC Medicines, Vitamins, etc.), subcategoryName = specific category
  const productData = [
    // PAIN RELIEF - Nurofen products
    { sku: "NUR-IBU-200-16", ean: "5000158100169", productName: "Nurofen Ibuprofen 200mg Tablets", brandName: "Nurofen", parentCategory: "OTC Medicines", subcategoryName: "Pain Relief", wholesalePrice: "2.45", rrp: "4.49", packSize: "16 tablets", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_ba80ee84.jpg", description: "Fast-acting pain relief for headaches, dental pain, period pain and muscular aches." },
    { sku: "NUR-IBU-400-24", ean: "5000158100244", productName: "Nurofen Ibuprofen 400mg Tablets", brandName: "Nurofen", parentCategory: "OTC Medicines", subcategoryName: "Pain Relief", wholesalePrice: "3.25", rrp: "5.99", packSize: "24 tablets", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_abb03774.jpg", description: "Maximum strength ibuprofen for effective relief from pain and inflammation." },
    { sku: "NUR-EXPRESS-16", ean: "5000158105102", productName: "Nurofen Express 256mg Sodium Ibuprofen", brandName: "Nurofen", parentCategory: "OTC Medicines", subcategoryName: "Pain Relief", wholesalePrice: "3.80", rrp: "6.99", packSize: "16 caplets", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_3180d043.jpg", description: "Absorbed faster than standard ibuprofen tablets for speedy pain relief." },
    { sku: "NUR-MIGRAINE-12", ean: "5000158105287", productName: "Nurofen Migraine Pain 342mg Caplets", brandName: "Nurofen", parentCategory: "OTC Medicines", subcategoryName: "Pain Relief", wholesalePrice: "4.20", rrp: "7.99", packSize: "12 caplets", moq: 12, isFeatured: false, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_429b1afa.jpg", description: "Specifically formulated for the relief of migraine headaches." },
    // PAIN RELIEF - Panadol products  
    { sku: "PAN-ORI-16", ean: "5014017600173", productName: "Panadol Original Paracetamol 500mg", brandName: "Panadol", parentCategory: "OTC Medicines", subcategoryName: "Pain Relief", wholesalePrice: "1.95", rrp: "3.79", packSize: "16 tablets", moq: 24, isFeatured: true, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_7bfe6df1.jpg", description: "Gentle yet effective pain relief with paracetamol." },
    { sku: "PAN-EXTRA-16", ean: "5014017600210", productName: "Panadol Extra Advance 500mg/65mg", brandName: "Panadol", parentCategory: "OTC Medicines", subcategoryName: "Pain Relief", wholesalePrice: "2.50", rrp: "4.79", packSize: "16 tablets", moq: 24, isFeatured: true, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_daeebc79.jpg", description: "Paracetamol with caffeine for enhanced pain relief." },
    { sku: "PAN-ACTIFAST-20", ean: "5014017600302", productName: "Panadol Actifast Soluble 500mg", brandName: "Panadol", parentCategory: "OTC Medicines", subcategoryName: "Pain Relief", wholesalePrice: "3.10", rrp: "5.99", packSize: "20 effervescent", moq: 12, isFeatured: false, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_cd311152.jpg", description: "Dissolves quickly for fast-acting pain relief." },
    // COLD & FLU - Lemsip products
    { sku: "LEM-MAX-10", ean: "5011417560808", productName: "Lemsip Max Cold & Flu Lemon", brandName: "Lemsip", categoryName: "Cold & Flu", wholesalePrice: "3.20", rrp: "5.99", packSize: "10 sachets", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/cough_syrup_medicine_8a8cf9b3.jpg", description: "Maximum strength hot lemon drink for cold and flu symptoms." },
    { sku: "LEM-MAX-CAPS-16", ean: "5011417560815", productName: "Lemsip Max All In One Capsules", brandName: "Lemsip", categoryName: "Cold & Flu", wholesalePrice: "3.80", rrp: "6.99", packSize: "16 capsules", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_3ab75966.jpg", description: "All-in-one relief for cold and flu symptoms in capsule form." },
    { sku: "LEM-FLU-MAX-8", ean: "5011417560822", productName: "Lemsip Flu Max Strength", brandName: "Lemsip", categoryName: "Cold & Flu", wholesalePrice: "4.50", rrp: "8.49", packSize: "8 sachets", moq: 12, isFeatured: false, imageUrl: "/attached_assets/stock_images/cough_syrup_medicine_fb6e77c9.jpg", description: "Extra strength relief for severe flu symptoms." },
    // COUGH & SORE THROAT - Strepsils products
    { sku: "STR-ORI-36", ean: "5000158100756", productName: "Strepsils Original Lozenges", brandName: "Strepsils", categoryName: "Cough & Sore Throat", wholesalePrice: "2.40", rrp: "4.29", packSize: "36 lozenges", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_69d00232.jpg", description: "Dual antibacterial action for sore throat relief." },
    { sku: "STR-HONEY-24", ean: "5000158100763", productName: "Strepsils Honey & Lemon Lozenges", brandName: "Strepsils", categoryName: "Cough & Sore Throat", wholesalePrice: "2.20", rrp: "3.99", packSize: "24 lozenges", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_b1daa8b5.jpg", description: "Soothing honey and lemon flavour with antibacterial action." },
    { sku: "STR-INTNSE-16", ean: "5000158100770", productName: "Strepsils Intensive Lozenges", brandName: "Strepsils", categoryName: "Cough & Sore Throat", wholesalePrice: "3.50", rrp: "6.49", packSize: "16 lozenges", moq: 12, isFeatured: false, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_ba80ee84.jpg", description: "Contains flurbiprofen for more intensive sore throat relief." },
    // COUGH & SORE THROAT - Benylin products
    { sku: "BEN-DRY-150", ean: "5011417560907", productName: "Benylin Dry Coughs Non-Drowsy 150ml", brandName: "Benylin", categoryName: "Cough & Sore Throat", wholesalePrice: "4.20", rrp: "7.49", packSize: "150ml", moq: 6, isFeatured: true, imageUrl: "/attached_assets/stock_images/cough_syrup_medicine_e1f83e85.jpg", description: "Non-drowsy formula for effective dry cough relief." },
    { sku: "BEN-CHEST-150", ean: "5011417560914", productName: "Benylin Chesty Coughs Non-Drowsy 150ml", brandName: "Benylin", categoryName: "Cough & Sore Throat", wholesalePrice: "4.20", rrp: "7.49", packSize: "150ml", moq: 6, isFeatured: true, imageUrl: "/attached_assets/stock_images/cough_syrup_medicine_556f0b96.jpg", description: "Helps clear stubborn chesty coughs without drowsiness." },
    { sku: "BEN-MUCUS-100", ean: "5011417560921", productName: "Benylin Mucus Cough Plus 100ml", brandName: "Benylin", categoryName: "Cough & Sore Throat", wholesalePrice: "3.80", rrp: "6.99", packSize: "100ml", moq: 6, isFeatured: false, imageUrl: "/attached_assets/stock_images/cough_syrup_medicine_461806c0.jpg", description: "Thins and loosens mucus to make coughs more productive." },
    // HEARTBURN & INDIGESTION - Gaviscon products
    { sku: "GAV-DOU-300", ean: "5000158100909", productName: "Gaviscon Double Action Liquid 300ml", brandName: "Gaviscon", categoryName: "Heartburn & Indigestion", wholesalePrice: "4.50", rrp: "8.29", packSize: "300ml", moq: 6, isFeatured: true, imageUrl: "/attached_assets/stock_images/cough_syrup_medicine_8a8cf9b3.jpg", description: "Double action relief from heartburn and acid indigestion." },
    { sku: "GAV-ADV-24", ean: "5000158100916", productName: "Gaviscon Advance Tablets Mint", brandName: "Gaviscon", categoryName: "Heartburn & Indigestion", wholesalePrice: "3.20", rrp: "5.99", packSize: "24 tablets", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_abb03774.jpg", description: "Chewable tablets for on-the-go heartburn relief." },
    { sku: "GAV-INF-150", ean: "5000158100923", productName: "Gaviscon Infant Oral Powder", brandName: "Gaviscon", categoryName: "Heartburn & Indigestion", wholesalePrice: "5.20", rrp: "9.49", packSize: "30 sachets", moq: 6, isFeatured: false, imageUrl: "/attached_assets/stock_images/baby_child_medicine__b26a7473.jpg", description: "For regurgitation and gastric reflux in infants." },
    // HEARTBURN & INDIGESTION - Rennie products
    { sku: "REN-ORIG-48", ean: "5014017600401", productName: "Rennie Peppermint Tablets", brandName: "Rennie", categoryName: "Heartburn & Indigestion", wholesalePrice: "2.80", rrp: "4.99", packSize: "48 tablets", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_3180d043.jpg", description: "Fast-acting antacid for heartburn and indigestion." },
    { sku: "REN-SPEARMINT-24", ean: "5014017600418", productName: "Rennie Spearmint Tablets", brandName: "Rennie", categoryName: "Heartburn & Indigestion", wholesalePrice: "1.80", rrp: "3.29", packSize: "24 tablets", moq: 12, isFeatured: false, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_429b1afa.jpg", description: "Refreshing spearmint flavour for quick relief." },
    // DIGESTIVE HEALTH - Imodium products
    { sku: "IMO-ORIG-6", ean: "5000158100501", productName: "Imodium Original 2mg Capsules", brandName: "Imodium", categoryName: "Digestive Health", wholesalePrice: "2.80", rrp: "4.99", packSize: "6 capsules", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_7bfe6df1.jpg", description: "Effective relief from acute diarrhoea." },
    { sku: "IMO-INST-6", ean: "5000158100518", productName: "Imodium Instants 2mg Melts", brandName: "Imodium", categoryName: "Digestive Health", wholesalePrice: "3.50", rrp: "6.29", packSize: "6 melts", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_daeebc79.jpg", description: "Melts on the tongue - no water needed." },
    { sku: "IMO-PLUS-12", ean: "5000158100525", productName: "Imodium Plus Comfort Tablets", brandName: "Imodium", categoryName: "Digestive Health", wholesalePrice: "4.20", rrp: "7.49", packSize: "12 tablets", moq: 12, isFeatured: false, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_cd311152.jpg", description: "Relieves diarrhoea plus painful cramps and bloating." },
    // ALLERGY RELIEF - Piriteze and Piriton
    { sku: "PIZ-ONE-30", ean: "5000158102307", productName: "Piriteze Allergy Tablets 10mg", brandName: "Piriteze", categoryName: "Allergy Relief", wholesalePrice: "4.50", rrp: "8.49", packSize: "30 tablets", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_3ab75966.jpg", description: "One-a-day non-drowsy antihistamine for hayfever and allergies." },
    { sku: "PIZ-SYR-70", ean: "5000158102314", productName: "Piriteze Allergy Syrup 70ml", brandName: "Piriteze", categoryName: "Allergy Relief", wholesalePrice: "3.80", rrp: "6.99", packSize: "70ml", moq: 6, isFeatured: false, imageUrl: "/attached_assets/stock_images/cough_syrup_medicine_fb6e77c9.jpg", description: "One-a-day liquid antihistamine for ages 2+." },
    { sku: "PIR-4MG-30", ean: "5000158102401", productName: "Piriton Allergy Tablets 4mg", brandName: "Piriton", categoryName: "Allergy Relief", wholesalePrice: "3.20", rrp: "5.99", packSize: "30 tablets", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_69d00232.jpg", description: "Fast-acting chlorphenamine for allergy symptoms." },
    { sku: "PIR-SYR-150", ean: "5000158102418", productName: "Piriton Syrup 150ml", brandName: "Piriton", categoryName: "Allergy Relief", wholesalePrice: "4.20", rrp: "7.49", packSize: "150ml", moq: 6, isFeatured: false, imageUrl: "/attached_assets/stock_images/cough_syrup_medicine_e1f83e85.jpg", description: "Antihistamine syrup suitable for children from 1 year." },
    // VITAMINS & SUPPLEMENTS - Vitabiotics
    { sku: "VIT-WELLMAN-30", ean: "5021265217601", productName: "Wellman Original 30 Tablets", brandName: "Vitabiotics", categoryName: "Multivitamins", wholesalePrice: "5.50", rrp: "10.49", packSize: "30 tablets", moq: 6, isFeatured: true, imageUrl: "/attached_assets/stock_images/vitamin_supplement_b_79241704.jpg", description: "Complete vitamin formula for men with 29 nutrients." },
    { sku: "VIT-WELLWOMAN-30", ean: "5021265217618", productName: "Wellwoman Original 30 Capsules", brandName: "Vitabiotics", categoryName: "Multivitamins", wholesalePrice: "5.50", rrp: "10.49", packSize: "30 capsules", moq: 6, isFeatured: true, imageUrl: "/attached_assets/stock_images/vitamin_supplement_b_00a7d6de.jpg", description: "Complete vitamin formula for women with 25 nutrients." },
    { sku: "VIT-PREGNA-30", ean: "5021265217625", productName: "Pregnacare Original 30 Tablets", brandName: "Vitabiotics", categoryName: "Women's Health", wholesalePrice: "4.80", rrp: "8.99", packSize: "30 tablets", moq: 6, isFeatured: true, imageUrl: "/attached_assets/stock_images/vitamin_supplement_b_31545ce3.jpg", description: "Essential nutrients for pregnancy including folic acid." },
    { sku: "VIT-MENOP-30", ean: "5021265217632", productName: "Menopace Original 30 Tablets", brandName: "Vitabiotics", categoryName: "Women's Health", wholesalePrice: "6.20", rrp: "11.49", packSize: "30 tablets", moq: 6, isFeatured: false, imageUrl: "/attached_assets/stock_images/vitamin_supplement_b_156cdfad.jpg", description: "Nutritional support during and after the menopause." },
    // VITAMINS & SUPPLEMENTS - Seven Seas
    { sku: "SS-COD-120", ean: "5012335530102", productName: "Seven Seas Cod Liver Oil Capsules", brandName: "Seven Seas", categoryName: "Omega 3 & Fish Oils", wholesalePrice: "6.50", rrp: "11.99", packSize: "120 capsules", moq: 6, isFeatured: true, imageUrl: "/attached_assets/stock_images/vitamin_supplement_b_434336bd.jpg", description: "Pure cod liver oil rich in Omega-3 and vitamins A & D." },
    { sku: "SS-OMEGA-60", ean: "5012335530119", productName: "Seven Seas Omega-3 Fish Oil 1000mg", brandName: "Seven Seas", categoryName: "Omega 3 & Fish Oils", wholesalePrice: "7.20", rrp: "13.49", packSize: "60 capsules", moq: 6, isFeatured: true, imageUrl: "/attached_assets/stock_images/vitamin_supplement_b_ffeff786.jpg", description: "High strength Omega-3 for heart and brain health." },
    { sku: "SS-JOINTS-60", ean: "5012335530126", productName: "Seven Seas JointCare Max", brandName: "Seven Seas", categoryName: "Multivitamins", wholesalePrice: "9.50", rrp: "17.99", packSize: "60 tablets", moq: 6, isFeatured: false, imageUrl: "/attached_assets/stock_images/vitamin_supplement_b_51e43e23.jpg", description: "Glucosamine, chondroitin and omega-3 for joint support." },
    // VITAMINS & SUPPLEMENTS - Berocca
    { sku: "BER-EFF-30", ean: "5000166100309", productName: "Berocca Energy Orange 30 Effervescent", brandName: "Berocca", categoryName: "Energy & Immunity", wholesalePrice: "5.80", rrp: "10.99", packSize: "30 tablets", moq: 6, isFeatured: true, imageUrl: "/attached_assets/stock_images/vitamin_supplement_b_e114cd35.jpg", description: "Effervescent vitamin tablets for mental and physical energy." },
    { sku: "BER-BOOST-30", ean: "5000166100316", productName: "Berocca Boost 10mg Caffeine 30 Tablets", brandName: "Berocca", categoryName: "Energy & Immunity", wholesalePrice: "6.50", rrp: "12.49", packSize: "30 tablets", moq: 6, isFeatured: false, imageUrl: "/attached_assets/stock_images/vitamin_supplement_b_c7d60b7f.jpg", description: "Added caffeine and guarana for an extra energy boost." },
    // VITAMINS & SUPPLEMENTS - Centrum
    { sku: "CEN-ADV-30", ean: "5054563003010", productName: "Centrum Advance 30 Tablets", brandName: "Centrum", categoryName: "Multivitamins", wholesalePrice: "4.50", rrp: "8.49", packSize: "30 tablets", moq: 6, isFeatured: true, imageUrl: "/attached_assets/stock_images/vitamin_supplement_b_5ec2fa34.jpg", description: "Complete A-Z multivitamin for adults." },
    { sku: "CEN-ADV-60", ean: "5054563003027", productName: "Centrum Advance 60 Tablets", brandName: "Centrum", categoryName: "Multivitamins", wholesalePrice: "7.80", rrp: "14.49", packSize: "60 tablets", moq: 6, isFeatured: false, imageUrl: "/attached_assets/stock_images/vitamin_supplement_b_79241704.jpg", description: "2-month supply of complete A-Z multivitamin." },
    { sku: "CEN-50P-30", ean: "5054563003034", productName: "Centrum Advance 50 Plus 30 Tablets", brandName: "Centrum", categoryName: "Multivitamins", wholesalePrice: "5.20", rrp: "9.49", packSize: "30 tablets", moq: 6, isFeatured: false, imageUrl: "/attached_assets/stock_images/vitamin_supplement_b_00a7d6de.jpg", description: "Tailored formula for adults over 50." },
    // VITAMINS & SUPPLEMENTS - Floradix
    { sku: "FLO-IRON-250", ean: "4008617001052", productName: "Floradix Liquid Iron 250ml", brandName: "Floradix", categoryName: "Iron Supplements", wholesalePrice: "8.50", rrp: "15.99", packSize: "250ml", moq: 6, isFeatured: true, imageUrl: "/attached_assets/stock_images/cough_syrup_medicine_556f0b96.jpg", description: "Easily absorbed liquid iron formula with vitamins." },
    { sku: "FLO-IRON-500", ean: "4008617001069", productName: "Floradix Liquid Iron 500ml", brandName: "Floradix", categoryName: "Iron Supplements", wholesalePrice: "14.50", rrp: "27.49", packSize: "500ml", moq: 4, isFeatured: false, imageUrl: "/attached_assets/stock_images/cough_syrup_medicine_461806c0.jpg", description: "Family size easily absorbed liquid iron formula." },
    // SKINCARE - E45
    { sku: "E45-CREAM-350", ean: "5010999801002", productName: "E45 Moisturising Cream 350g", brandName: "E45", categoryName: "Dry Skin", wholesalePrice: "5.50", rrp: "9.99", packSize: "350g", moq: 6, isFeatured: true, imageUrl: "/attached_assets/stock_images/skincare_cream_moist_408415d9.jpg", description: "Clinically proven to treat dry, flaky skin." },
    { sku: "E45-LOTION-500", ean: "5010999801019", productName: "E45 Moisturising Lotion 500ml", brandName: "E45", categoryName: "Dry Skin", wholesalePrice: "6.80", rrp: "12.49", packSize: "500ml", moq: 6, isFeatured: true, imageUrl: "/attached_assets/stock_images/skincare_cream_moist_c08b43c4.jpg", description: "Light, fast-absorbing lotion for everyday dry skin." },
    { sku: "E45-ITCH-50", ean: "5010999801026", productName: "E45 Itch Relief Cream 50g", brandName: "E45", categoryName: "Eczema & Psoriasis", wholesalePrice: "4.20", rrp: "7.49", packSize: "50g", moq: 6, isFeatured: false, imageUrl: "/attached_assets/stock_images/skincare_cream_moist_3a2f02b2.jpg", description: "Provides relief from dry, itchy skin conditions." },
    // SKINCARE - CeraVe
    { sku: "CER-MOIST-177", ean: "3337875597449", productName: "CeraVe Moisturising Cream 177ml", brandName: "CeraVe", categoryName: "Moisturisers", wholesalePrice: "7.50", rrp: "13.99", packSize: "177ml", moq: 6, isFeatured: true, imageUrl: "/attached_assets/stock_images/skincare_cream_moist_f99b292d.jpg", description: "With 3 essential ceramides for normal to dry skin." },
    { sku: "CER-FOAM-236", ean: "3337875597456", productName: "CeraVe Foaming Cleanser 236ml", brandName: "CeraVe", categoryName: "Moisturisers", wholesalePrice: "6.80", rrp: "12.49", packSize: "236ml", moq: 6, isFeatured: true, imageUrl: "/attached_assets/stock_images/skincare_cream_moist_d27441ee.jpg", description: "Foaming gel cleanser for normal to oily skin." },
    { sku: "CER-HYDRA-236", ean: "3337875597463", productName: "CeraVe Hydrating Cleanser 236ml", brandName: "CeraVe", categoryName: "Dry Skin", wholesalePrice: "6.80", rrp: "12.49", packSize: "236ml", moq: 6, isFeatured: false, imageUrl: "/attached_assets/stock_images/skincare_cream_moist_408415d9.jpg", description: "Hydrating cleanser for normal to dry skin." },
    // SKINCARE - Simple
    { sku: "SIM-MOIS-125", ean: "5011451101357", productName: "Simple Kind to Skin Moisturiser 125ml", brandName: "Simple", categoryName: "Moisturisers", wholesalePrice: "3.50", rrp: "5.99", packSize: "125ml", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/skincare_cream_moist_c08b43c4.jpg", description: "Light, non-greasy moisturiser for sensitive skin." },
    { sku: "SIM-WIPES-25", ean: "5011451101364", productName: "Simple Cleansing Wipes 25 Pack", brandName: "Simple", categoryName: "Moisturisers", wholesalePrice: "2.20", rrp: "3.99", packSize: "25 wipes", moq: 12, isFeatured: false, imageUrl: "/attached_assets/stock_images/skincare_cream_moist_3a2f02b2.jpg", description: "Gentle cleansing wipes for sensitive skin." },
    // ORAL CARE - Sensodyne
    { sku: "SEN-RAPID-75", ean: "5000347003714", productName: "Sensodyne Rapid Relief Original 75ml", brandName: "Sensodyne", categoryName: "Toothpaste", wholesalePrice: "3.20", rrp: "5.99", packSize: "75ml", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_ba80ee84.jpg", description: "Clinically proven sensitivity relief in 60 seconds." },
    { sku: "SEN-REPAIR-75", ean: "5000347003721", productName: "Sensodyne Repair & Protect 75ml", brandName: "Sensodyne", categoryName: "Toothpaste", wholesalePrice: "3.50", rrp: "6.49", packSize: "75ml", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_abb03774.jpg", description: "Builds a repairing layer over sensitive areas." },
    { sku: "SEN-WHITE-75", ean: "5000347003738", productName: "Sensodyne True White 75ml", brandName: "Sensodyne", categoryName: "Toothpaste", wholesalePrice: "3.80", rrp: "6.99", packSize: "75ml", moq: 12, isFeatured: false, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_3180d043.jpg", description: "Whitening toothpaste for sensitive teeth." },
    // ORAL CARE - Corsodyl
    { sku: "COR-MW-300", ean: "5000347040511", productName: "Corsodyl Daily Gum Care Mouthwash 300ml", brandName: "Corsodyl", categoryName: "Mouthwash", wholesalePrice: "3.50", rrp: "6.49", packSize: "300ml", moq: 6, isFeatured: true, imageUrl: "/attached_assets/stock_images/cough_syrup_medicine_8a8cf9b3.jpg", description: "Daily mouthwash for healthier gums." },
    { sku: "COR-GEL-50", ean: "5000347040528", productName: "Corsodyl Intensive Treatment Gel 50g", brandName: "Corsodyl", categoryName: "Mouthwash", wholesalePrice: "4.20", rrp: "7.49", packSize: "50g", moq: 6, isFeatured: false, imageUrl: "/attached_assets/stock_images/skincare_cream_moist_f99b292d.jpg", description: "Intensive treatment for bleeding gums." },
    // ORAL CARE - Bonjela
    { sku: "BON-ADULT-15", ean: "5000386020017", productName: "Bonjela Adult Gel 15g", brandName: "Bonjela", categoryName: "Mouth Ulcers", wholesalePrice: "3.20", rrp: "5.99", packSize: "15g", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/skincare_cream_moist_d27441ee.jpg", description: "Fast relief from mouth ulcers and denture sores." },
    { sku: "BON-JNR-15", ean: "5000386020024", productName: "Bonjela Junior Gel 15g", brandName: "Bonjela", categoryName: "Mouth Ulcers", wholesalePrice: "3.50", rrp: "6.49", packSize: "15g", moq: 12, isFeatured: false, imageUrl: "/attached_assets/stock_images/baby_child_medicine__81549c36.jpg", description: "Sugar-free gel for children's mouth ulcers." },
    // FIRST AID - Elastoplast
    { sku: "ELA-AST-40", ean: "4005800001017", productName: "Elastoplast Sensitive Plasters 40 Pack", brandName: "Elastoplast", categoryName: "Plasters", wholesalePrice: "2.80", rrp: "4.99", packSize: "40 plasters", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/first_aid_bandage_me_cce8b7ef.jpg", description: "Extra skin-friendly plasters for sensitive skin." },
    { sku: "ELA-WATER-20", ean: "4005800001024", productName: "Elastoplast Waterproof Plasters 20 Pack", brandName: "Elastoplast", categoryName: "Plasters", wholesalePrice: "2.50", rrp: "4.49", packSize: "20 plasters", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/first_aid_bandage_me_96bd72ab.jpg", description: "100% waterproof protection for cuts and grazes." },
    { sku: "ELA-FABRIC-20", ean: "4005800001031", productName: "Elastoplast Fabric Plasters 20 Pack", brandName: "Elastoplast", categoryName: "Plasters", wholesalePrice: "2.20", rrp: "3.99", packSize: "20 plasters", moq: 12, isFeatured: false, imageUrl: "/attached_assets/stock_images/first_aid_bandage_me_acfa1e82.jpg", description: "Flexible fabric plasters that move with you." },
    // FIRST AID - Savlon
    { sku: "SAV-CREAM-60", ean: "5011417560501", productName: "Savlon Antiseptic Cream 60g", brandName: "Savlon", categoryName: "Antiseptics", wholesalePrice: "2.80", rrp: "4.99", packSize: "60g", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/skincare_cream_moist_408415d9.jpg", description: "Helps prevent infection in minor wounds and burns." },
    { sku: "SAV-SPRAY-50", ean: "5011417560518", productName: "Savlon Antiseptic Wound Wash 50ml", brandName: "Savlon", categoryName: "Antiseptics", wholesalePrice: "3.20", rrp: "5.99", packSize: "50ml", moq: 12, isFeatured: false, imageUrl: "/attached_assets/stock_images/first_aid_bandage_me_efa1a609.jpg", description: "Gentle spray to clean and help prevent infection." },
    // FIRST AID - Dettol
    { sku: "DET-LIQ-500", ean: "5000158100206", productName: "Dettol Antiseptic Liquid 500ml", brandName: "Dettol", categoryName: "Antiseptics", wholesalePrice: "3.50", rrp: "6.49", packSize: "500ml", moq: 6, isFeatured: true, imageUrl: "/attached_assets/stock_images/cough_syrup_medicine_fb6e77c9.jpg", description: "Trusted antiseptic for wounds and household use." },
    { sku: "DET-WIPES-40", ean: "5000158100213", productName: "Dettol Antibacterial Wipes 40 Pack", brandName: "Dettol", categoryName: "Antiseptics", wholesalePrice: "2.50", rrp: "4.49", packSize: "40 wipes", moq: 12, isFeatured: false, imageUrl: "/attached_assets/stock_images/first_aid_bandage_me_db473e7c.jpg", description: "Antibacterial surface cleaning wipes." },
    // BABY & CHILD - Calpol
    { sku: "CAL-INF-100", ean: "5000347001017", productName: "Calpol Infant Suspension Strawberry 100ml", brandName: "Calpol", categoryName: "Baby Pain Relief", wholesalePrice: "3.80", rrp: "6.99", packSize: "100ml", moq: 6, isFeatured: true, imageUrl: "/attached_assets/stock_images/baby_child_medicine__b26a7473.jpg", description: "Paracetamol suspension for babies 2 months+." },
    { sku: "CAL-6PLU-100", ean: "5000347001024", productName: "Calpol Six Plus Suspension 100ml", brandName: "Calpol", categoryName: "Baby Pain Relief", wholesalePrice: "3.50", rrp: "6.49", packSize: "100ml", moq: 6, isFeatured: true, imageUrl: "/attached_assets/stock_images/baby_child_medicine__81549c36.jpg", description: "Paracetamol suspension for children 6 years+." },
    { sku: "CAL-SALINE-15", ean: "5000347001031", productName: "Calpol Soothe & Care Saline Drops 15ml", brandName: "Calpol", categoryName: "Baby Pain Relief", wholesalePrice: "3.20", rrp: "5.99", packSize: "15ml", moq: 12, isFeatured: false, imageUrl: "/attached_assets/stock_images/baby_child_medicine__387618a9.jpg", description: "Gentle saline drops to help clear baby's congestion." },
    // BABY & CHILD - Sudocrem
    { sku: "SUD-POT-125", ean: "5011451100015", productName: "Sudocrem Antiseptic Healing Cream 125g", brandName: "Sudocrem", categoryName: "Nappy Rash", wholesalePrice: "3.20", rrp: "5.99", packSize: "125g", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/skincare_cream_moist_c08b43c4.jpg", description: "The original nappy rash cream trusted for generations." },
    { sku: "SUD-POT-250", ean: "5011451100022", productName: "Sudocrem Antiseptic Healing Cream 250g", brandName: "Sudocrem", categoryName: "Nappy Rash", wholesalePrice: "5.50", rrp: "9.99", packSize: "250g", moq: 6, isFeatured: false, imageUrl: "/attached_assets/stock_images/skincare_cream_moist_3a2f02b2.jpg", description: "Family size nappy rash and skin care cream." },
    // BABY & CHILD - Bepanthen
    { sku: "BEP-NAPPY-100", ean: "5054563000019", productName: "Bepanthen Nappy Care Ointment 100g", brandName: "Bepanthen", categoryName: "Nappy Rash", wholesalePrice: "4.50", rrp: "8.49", packSize: "100g", moq: 6, isFeatured: true, imageUrl: "/attached_assets/stock_images/skincare_cream_moist_f99b292d.jpg", description: "Gentle protection with provitamin B5." },
    { sku: "BEP-SENSE-20", ean: "5054563000026", productName: "Bepanthen Sensiderm Cream 20g", brandName: "Bepanthen", categoryName: "Eczema & Psoriasis", wholesalePrice: "5.80", rrp: "10.99", packSize: "20g", moq: 6, isFeatured: false, imageUrl: "/attached_assets/stock_images/skincare_cream_moist_d27441ee.jpg", description: "For eczema-prone and itchy, irritated skin." },
    // BABY & CHILD - Infacol
    { sku: "INF-DROPS-50", ean: "5011451102017", productName: "Infacol Colic Relief Drops 50ml", brandName: "Infacol", categoryName: "Colic Relief", wholesalePrice: "3.50", rrp: "6.49", packSize: "50ml", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/baby_child_medicine__9fca952e.jpg", description: "Helps relieve colic and griping pain in babies." },
    { sku: "INF-DROPS-85", ean: "5011451102024", productName: "Infacol Colic Relief Drops 85ml", brandName: "Infacol", categoryName: "Colic Relief", wholesalePrice: "5.20", rrp: "9.49", packSize: "85ml", moq: 6, isFeatured: false, imageUrl: "/attached_assets/stock_images/baby_child_medicine__0d6b80c6.jpg", description: "Large size colic relief drops." },
    // BABY & CHILD - Dentinox
    { sku: "DEN-TEETH-15", ean: "5011451103014", productName: "Dentinox Teething Gel 15g", brandName: "Dentinox", categoryName: "Teething", wholesalePrice: "2.80", rrp: "4.99", packSize: "15g", moq: 12, isFeatured: true, imageUrl: "/attached_assets/stock_images/baby_child_medicine__b26a7473.jpg", description: "Sugar-free teething gel for babies from birth." },
    { sku: "DEN-COLIC-100", ean: "5011451103021", productName: "Dentinox Infant Colic Drops 100ml", brandName: "Dentinox", categoryName: "Colic Relief", wholesalePrice: "3.20", rrp: "5.99", packSize: "100ml", moq: 6, isFeatured: false, imageUrl: "/attached_assets/stock_images/baby_child_medicine__81549c36.jpg", description: "Helps relieve wind, griping pain and colic." },
    // MEDICAL DEVICES - Omron
    { sku: "OMR-M2-BPM", ean: "4015672107014", productName: "Omron M2 Basic Blood Pressure Monitor", brandName: "Omron", categoryName: "Blood Pressure Monitors", wholesalePrice: "24.50", rrp: "44.99", packSize: "1 unit", moq: 2, isFeatured: true, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_7bfe6df1.jpg", description: "Clinically validated automatic blood pressure monitor." },
    { sku: "OMR-M3-BPM", ean: "4015672107021", productName: "Omron M3 Comfort Blood Pressure Monitor", brandName: "Omron", categoryName: "Blood Pressure Monitors", wholesalePrice: "42.50", rrp: "79.99", packSize: "1 unit", moq: 2, isFeatured: true, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_daeebc79.jpg", description: "Advanced monitor with irregular heartbeat detection." },
    // MEDICAL DEVICES - Accu-Chek
    { sku: "ACC-GUIDE-KIT", ean: "4015630074013", productName: "Accu-Chek Guide Blood Glucose Monitor", brandName: "Accu-Chek", categoryName: "Glucose Monitors", wholesalePrice: "18.50", rrp: "34.99", packSize: "1 kit", moq: 2, isFeatured: true, imageUrl: "/attached_assets/stock_images/medicine_tablets_pil_cd311152.jpg", description: "Easy-to-use blood glucose monitoring system." },
    { sku: "ACC-STRIPS-50", ean: "4015630074020", productName: "Accu-Chek Guide Test Strips 50 Pack", brandName: "Accu-Chek", categoryName: "Glucose Monitors", wholesalePrice: "14.50", rrp: "27.99", packSize: "50 strips", moq: 4, isFeatured: false, imageUrl: "/attached_assets/stock_images/first_aid_bandage_me_cce8b7ef.jpg", description: "Blood glucose test strips for Accu-Chek Guide." },
  ];

  // Build subcategory to parent map
  const allCategories = await db.select().from(categories);
  const categoryParentMap: Record<number, number | null> = {};
  const categoryNameToIdMap: Record<string, number> = {};
  for (const cat of allCategories) {
    categoryParentMap[cat.id] = cat.parentId;
    categoryNameToIdMap[cat.name] = cat.id;
  }

  // Wrap product seeding in try-catch so it doesn't break the rest of the seed
  try {
    for (const product of productData) {
      const brandId = brandMap[product.brandName];
      if (!brandId) {
        console.log(`Warning: Brand not found for product ${product.productName}: ${product.brandName}`);
        continue;
      }

      // Determine parent category and subcategory from categoryName
      let categoryId: number | null = null;
      let subcategoryId: number | null = null;
      
      // categoryName refers to the subcategory - find it and its parent
      const categoryName = product.categoryName;
      if (!categoryName) {
        console.log(`Warning: No categoryName for product ${product.productName}`);
        continue;
      }
      const catId = categoryNameToIdMap[categoryName];
      if (catId) {
      const parentId = categoryParentMap[catId];
      if (parentId) {
        // This is a subcategory - use parent as categoryId
        categoryId = parentId;
        subcategoryId = catId;
      } else {
        // This is a top-level category
        categoryId = catId;
        subcategoryId = null;
      }
    }
    
    if (!categoryId) {
      console.log(`Warning: Category not found for product ${product.productName}`);
      continue;
    }
    
    const existing = await db.select().from(products).where(eq(products.sku, product.sku));
    if (existing.length === 0) {
      await db.insert(products).values({
        sku: product.sku,
        ean: product.ean,
        productName: product.productName,
        shortDescription: product.description,
        brandId,
        categoryId,
        subcategoryId,
        wholesalePrice: product.wholesalePrice,
        rrp: product.rrp,
        packSize: product.packSize,
        moq: product.moq,
        isFeatured: product.isFeatured,
        isActive: true,
        imageUrl: product.imageUrl,
        uom: "each",
        vatRate: "0.20",
        countryOfOrigin: "United Kingdom",
      });
      console.log(`Product created: ${product.productName}`);
    } else {
      // Update existing product with new data
      await db.update(products)
        .set({
          ean: product.ean,
          shortDescription: product.description,
          imageUrl: product.imageUrl,
          countryOfOrigin: "United Kingdom",
          subcategoryId,
        })
        .where(eq(products.sku, product.sku));
      console.log(`Product updated: ${product.productName}`);
      }
    }
  } catch (productError: any) {
    console.log(`Warning: Product seeding encountered errors (continuing with rest of seed): ${productError.message}`);
  }

  // Create default site settings
  const settingsData = [
    { key: "site_name", value: "Pharma Oasis", description: "Website name" },
    { key: "site_tagline", value: "Your Wholesale Healthcare Partner", description: "Website tagline" },
    { key: "contact_email", value: "trade@pharmaoasis.com", description: "Main contact email" },
    { key: "contact_phone", value: "+44 7481 640640", description: "Main contact phone" },
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
    { key: "footer_tagline", section: "footer", content: "Trusted wholesale partner to 3,000+ UK pharmacies. Licensed healthcare, wellness and beauty distributor.", contentType: "text" },
    { key: "footer_copyright", section: "footer", content: "Pharma Oasis Limited. All rights reserved.", contentType: "text" },
    { key: "footer_quick_links", section: "footer", content: JSON.stringify([
      { label: "Product Catalogue", url: "/products" },
      { label: "Our Brands", url: "/brands" },
      { label: "How to Order", url: "/how-to-order" },
      { label: "Register as Customer", url: "/register" },
      { label: "Become a Supplier", url: "/supplier-registration" },
      { label: "About Us", url: "/about" },
      { label: "Contact Us", url: "/contact" }
    ]), contentType: "json" },
    { key: "footer_policy_links", section: "footer", content: JSON.stringify([
      { label: "Privacy Policy", url: "/privacy" },
      { label: "Terms of Use", url: "/terms" },
      { label: "Cookie Policy", url: "/cookies" }
    ]), contentType: "json" },
    { key: "contact_page_subtitle", section: "contact", content: "Have questions about our products or services? Our team is here to help.", contentType: "text" },
    { key: "contact_business_hours", section: "contact", content: JSON.stringify([
      { day: "Monday - Friday", hours: "9am - 6pm" },
      { day: "Saturday", hours: "9am - 1pm" },
      { day: "Sunday", hours: "Closed" }
    ]), contentType: "json" },
    { key: "contact_response_time", section: "contact", content: "24 hours", contentType: "text" },
    { key: "contact_urgent_title", section: "contact", content: "Need Urgent Assistance?", contentType: "text" },
    { key: "contact_urgent_text", section: "contact", content: "For urgent orders or time-sensitive inquiries, please call our priority line.", contentType: "text" },
  ];

  for (const block of cmsData) {
    const existing = await db.select().from(cmsBlocks).where(eq(cmsBlocks.key, block.key));
    if (existing.length === 0) {
      await db.insert(cmsBlocks).values(block);
      console.log(`CMS block created: ${block.key}`);
    }
  }

  // Create hero slides - all 8 banners (user uploads + additional slides)
  const heroSlidesData = [
    // User's 4 uploaded banners
    {
      title: "Keeping UK Pharmacies Stocked & Ready",
      subtitle: "Reliable, fast distribution to ensure you have the right products when your patients need them most.",
      ctaLabel: "Partner With Us",
      ctaHref: "/supplier-registration",
      imageUrl: "/assets/Banner1.jpg",
      position: 1,
      isActive: true,
    },
    {
      title: "A Comprehensive Healthcare Portfolio",
      subtitle: "From Pharmaceuticals and OTC medicine to Vitamins, Medical Devices, and Skincare. Everything your customers need.",
      ctaLabel: "Browse Categories",
      ctaHref: "/products",
      imageUrl: "/assets/banner2.jpg",
      position: 2,
      isActive: true,
    },
    {
      title: "MHRA Licensed & GDP Compliant",
      subtitle: "Ensuring regulatory compliance and total supply chain integrity from our warehouse to your pharmacy door.",
      ctaLabel: "View our Credentials",
      ctaHref: "/about",
      imageUrl: "/assets/banner3.jpg",
      position: 3,
      isActive: true,
    },
    {
      title: "Your Wholesale Partner for Healthcare Excellence",
      subtitle: "Access 20,000+ healthcare products at competitive wholesale prices. Trusted by pharmacies across the UK.",
      ctaLabel: "Explore the Range",
      ctaHref: "/products",
      imageUrl: "/assets/banner4.jpg",
      position: 4,
      isActive: true,
    },
    // Additional 4 banners with gradient backgrounds
    {
      title: "Direct from Manufacturers",
      subtitle: "We work directly with leading pharmaceutical brands to bring you authentic products at the best wholesale prices.",
      ctaLabel: "View Our Brands",
      ctaHref: "/brands",
      imageUrl: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1920&h=600&fit=crop&auto=format",
      position: 5,
      isActive: true,
    },
    {
      title: "Temperature-Controlled Supply Chain",
      subtitle: "GDP-compliant cold chain logistics ensuring product integrity from our warehouse to your pharmacy.",
      ctaLabel: "Learn More",
      ctaHref: "/about",
      imageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1920&h=600&fit=crop&auto=format",
      position: 6,
      isActive: true,
    },
    {
      title: "Trusted by 3,000+ UK Pharmacies",
      subtitle: "Join thousands of healthcare professionals who rely on Pharma Oasis for their wholesale needs.",
      ctaLabel: "Register Today",
      ctaHref: "/register",
      imageUrl: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=1920&h=600&fit=crop&auto=format",
      position: 7,
      isActive: true,
    },
    {
      title: "Next-Day Delivery Nationwide",
      subtitle: "Fast, reliable delivery across the UK. Order by 5pm for next-day dispatch on in-stock items.",
      ctaLabel: "Start Ordering",
      ctaHref: "/products",
      imageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1920&h=600&fit=crop&auto=format",
      position: 8,
      isActive: true,
    },
    {
      title: "Global Distribution Network",
      subtitle: "From our UK headquarters to pharmacies worldwide. We export to Europe, Asia, Africa and beyond with reliable international logistics.",
      ctaLabel: "Partner With Us",
      ctaHref: "/supplier-registration",
      imageUrl: "/assets/global-distribution-map.png",
      position: 9,
      isActive: true,
    },
  ];

  // Delete existing hero slides and insert new ones
  await db.delete(heroSlides);
  console.log("Cleared existing hero slides");
  
  for (const slide of heroSlidesData) {
    await db.insert(heroSlides).values(slide);
    console.log(`Hero slide created: ${slide.title}`);
  }

  // Create company locations - UK headquarters and global presence
  const locationData = [
    {
      locationType: "headquarters",
      locationName: "UK Headquarters & Warehouse",
      companyName: "Pharma Oasis Limited",
      addressLine1: "Unit - J, Doddington Park Farmhouse",
      addressLine2: "Bridgemere",
      city: "Nantwich",
      postcode: "CW5 7PU",
      country: "United Kingdom",
      vatNumber: "364 4962 68",
      companyRegNumber: "11369972",
      wdaLicenceNumber: "53820",
      position: 1,
      isActive: true,
    },
    {
      locationType: "distribution",
      locationName: "European Distribution Centre",
      companyName: "Pharma Oasis Europe B.V.",
      addressLine1: "Havenweg 35",
      city: "Rotterdam",
      postcode: "3089 JH",
      country: "Netherlands",
      position: 2,
      isActive: true,
    },
    {
      locationType: "office",
      locationName: "Middle East Office",
      companyName: "Pharma Oasis MENA",
      addressLine1: "Dubai Healthcare City",
      city: "Dubai",
      country: "United Arab Emirates",
      position: 3,
      isActive: true,
    },
    {
      locationType: "sourcing",
      locationName: "Asia Sourcing Hub",
      companyName: "Pharma Oasis Asia",
      addressLine1: "Bandra Kurla Complex",
      city: "Mumbai",
      country: "India",
      position: 4,
      isActive: true,
    },
  ];

  // Clear and insert company locations
  await db.delete(companyLocations);
  console.log("Cleared existing company locations");

  for (const location of locationData) {
    await db.insert(companyLocations).values(location);
    console.log(`Location created: ${location.locationName}`);
  }

  // ============================================
  // HOMEPAGE STATS
  // ============================================
  const homeStatsData = [
    { value: "50+", label: "Premium Brands", type: "stat", position: 1, isActive: true },
    { value: "20K+", label: "Products Available", type: "stat", position: 2, isActive: true },
    { value: "98%", label: "Order Accuracy", type: "stat", position: 3, isActive: true },
    { value: "MHRA", label: "Licensed Distributor", type: "badge", position: 4, isActive: true },
    { value: "GDP", label: "Compliant", type: "badge", position: 5, isActive: true },
  ];

  await db.delete(homeStats);
  console.log("Cleared existing home stats");

  for (const stat of homeStatsData) {
    await db.insert(homeStats).values(stat);
    console.log(`Home stat created: ${stat.value} - ${stat.label}`);
  }

  // ============================================
  // HOMEPAGE FEATURES
  // ============================================
  const homeFeaturesData = [
    { iconName: "Shield", title: "MHRA Licensed", description: "Fully licensed WDA(H) holder ensuring regulatory compliance for all pharmaceutical products.", position: 1, isActive: true },
    { iconName: "Award", title: "GDP Compliant", description: "Good Distribution Practice certified supply chain from warehouse to delivery.", position: 2, isActive: true },
    { iconName: "Truck", title: "UK-Wide Delivery", description: "Fast, reliable next-day delivery across the United Kingdom with temperature control.", position: 3, isActive: true },
    { iconName: "Users", title: "Dedicated Support", description: "Expert account managers providing personalized service and competitive pricing.", position: 4, isActive: true },
  ];

  await db.delete(homeFeatures);
  console.log("Cleared existing home features");

  for (const feature of homeFeaturesData) {
    await db.insert(homeFeatures).values(feature);
    console.log(`Home feature created: ${feature.title}`);
  }

  // ============================================
  // HOMEPAGE CATEGORIES
  // ============================================
  const homeCategoriesData = [
    { name: "Pharmaceuticals", productCount: "5,000+ products", iconName: "Pill", linkHref: "/products?category=pharmaceuticals", position: 1, isActive: true },
    { name: "OTC Medicines", productCount: "3,500+ products", iconName: "Stethoscope", linkHref: "/products?category=otc", position: 2, isActive: true },
    { name: "Health & Wellness", productCount: "4,000+ products", iconName: "Heart", linkHref: "/products?category=health", position: 3, isActive: true },
    { name: "Beauty & Skincare", productCount: "3,000+ products", iconName: "Sparkles", linkHref: "/products?category=beauty", position: 4, isActive: true },
    { name: "Medical Devices", productCount: "2,500+ products", iconName: "Activity", linkHref: "/products?category=devices", position: 5, isActive: true },
    { name: "First Aid", productCount: "1,500+ products", iconName: "Cross", linkHref: "/products?category=firstaid", position: 6, isActive: true },
  ];

  await db.delete(homeCategories);
  console.log("Cleared existing home categories");

  for (const category of homeCategoriesData) {
    await db.insert(homeCategories).values(category);
    console.log(`Home category created: ${category.name}`);
  }

  // ============================================
  // HOMEPAGE PROCESS STEPS
  // ============================================
  const homeProcessStepsData = [
    { stepNumber: 1, title: "Register & Get Approved", description: "Complete our simple registration form. Our team reviews and approves qualified healthcare businesses.", position: 1, isActive: true },
    { stepNumber: 2, title: "Browse Products", description: "Access our full catalogue with wholesale pricing on 20,000+ healthcare products.", position: 2, isActive: true },
    { stepNumber: 3, title: "Request a Quote", description: "Add products to your basket and submit a quote request for competitive pricing.", position: 3, isActive: true },
    { stepNumber: 4, title: "Receive & Order", description: "Our team reviews your request and provides a formal quote. Accept and place your order.", position: 4, isActive: true },
  ];

  await db.delete(homeProcessSteps);
  console.log("Cleared existing home process steps");

  for (const step of homeProcessStepsData) {
    await db.insert(homeProcessSteps).values(step);
    console.log(`Home process step created: Step ${step.stepNumber} - ${step.title}`);
  }

  // ============================================
  // HOMEPAGE SECTIONS (Partner With Us, Export Services)
  // ============================================
  const homeSectionsData = [
    {
      sectionKey: "partner_with_us",
      badgeText: "Global Brands Welcome",
      badgeIcon: "Globe",
      title: "Expand Your Brand into the UK Market",
      subtitle: "Are you a brand from anywhere in the world looking to enter the UK healthcare and wellness market? Pharma Oasis is your trusted gateway to reaching pharmacies, retailers, and wholesalers across the United Kingdom.",
      description: "We welcome partnerships with international manufacturers and brands in these sectors:",
      bulletPoints: JSON.stringify([
        "Food Supplements & Nutraceuticals",
        "Cosmetics & Skincare Products",
        "Health Foods & Wellness Products",
        "Generic Medicines & Pharmaceuticals",
        "Medical Devices & Health Equipment"
      ]),
      primaryCtaLabel: "Discuss Partnership",
      primaryCtaHref: "/contact",
      primaryCtaIcon: "Handshake",
      secondaryCtaLabel: "Apply as Supplier",
      secondaryCtaHref: "/supplier-registration",
      cardTitle: "Why Partner With Us?",
      cardSubtitle: "Unlock the UK healthcare market",
      cardIcon: "Globe",
      cardItems: JSON.stringify([
        { icon: "BadgeCheck", title: "MHRA Compliance Support", description: "Navigate UK regulations with expert guidance" },
        { icon: "Users", title: "3,000+ Pharmacy Network", description: "Direct access to UK retail pharmacies" },
        { icon: "Truck", title: "Nationwide Distribution", description: "GDP-compliant logistics across the UK" }
      ]),
      position: 1,
      isActive: true,
    },
    {
      sectionKey: "export_services",
      badgeText: "International Export",
      badgeIcon: "Ship",
      title: "Import Genuine UK Products",
      subtitle: "Are you a wholesaler, pharmacy distributor, or importer looking for genuine UK healthcare products? Pharma Oasis supplies authentic British brands to customers worldwide.",
      description: "Whether you're sourcing vitamins, cosmetics, health foods, or pharmaceuticals, we provide the documentation and logistics support you need for seamless international import.",
      bulletPoints: JSON.stringify([
        "Genuine UK-sourced healthcare products",
        "MHRA & GDP certified supply chain",
        "Competitive wholesale export pricing",
        "Temperature-controlled shipping options",
        "Documentation for customs clearance"
      ]),
      primaryCtaLabel: "Request Export Quote",
      primaryCtaHref: "/contact",
      primaryCtaIcon: "Ship",
      secondaryCtaLabel: "Register as Importer",
      secondaryCtaHref: "/register",
      cardTitle: "Export Ready",
      cardSubtitle: "Serving international buyers worldwide",
      cardIcon: "Ship",
      cardItems: JSON.stringify([
        { icon: "Boxes", value: "20,000+", label: "Products" },
        { icon: "Globe", value: "Worldwide", label: "Shipping" },
        { icon: "FileCheck", value: "Full", label: "Documentation" },
        { icon: "Shield", value: "Genuine", label: "UK Products" }
      ]),
      position: 2,
      isActive: true,
    },
  ];

  await db.delete(homeSections);
  console.log("Cleared existing home sections");

  for (const section of homeSectionsData) {
    await db.insert(homeSections).values(section);
    console.log(`Home section created: ${section.sectionKey}`);
  }

  console.log("Database seed completed!");
}

// Only run if called directly (not imported)
// ESM-compatible check
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Seed error:", error);
      process.exit(1);
    });
}
