import { Router } from "express";
import { db } from "./db";
import { products, brands, categories } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

const SITE_URL = process.env.SITE_URL || "https://pharmaoasis.co.uk";

router.get("/sitemap.xml", async (req, res) => {
  try {
    const [allProducts, allCategories, allBrands] = await Promise.all([
      db.select({ id: products.id, sku: products.sku, slug: products.slug, updatedAt: products.updatedAt })
        .from(products)
        .where(eq(products.isActive, true)),
      db.select({ id: categories.id, name: categories.name, slug: categories.slug, parentId: categories.parentId, updatedAt: categories.updatedAt })
        .from(categories)
        .where(eq(categories.isActive, true)),
      db.select({ id: brands.id, name: brands.name, slug: brands.slug, updatedAt: brands.updatedAt })
        .from(brands)
        .where(eq(brands.isActive, true)),
    ]);

    const staticPages = [
      { loc: "/", priority: "1.0", changefreq: "daily" },
      { loc: "/products", priority: "0.9", changefreq: "daily" },
      { loc: "/brands", priority: "0.8", changefreq: "weekly" },
      { loc: "/about", priority: "0.6", changefreq: "monthly" },
      { loc: "/contact", priority: "0.6", changefreq: "monthly" },
      { loc: "/register", priority: "0.7", changefreq: "monthly" },
      { loc: "/supplier-registration", priority: "0.6", changefreq: "monthly" },
      { loc: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
      { loc: "/terms-conditions", priority: "0.3", changefreq: "yearly" },
      { loc: "/cookie-policy", priority: "0.3", changefreq: "yearly" },
    ];

    const now = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    for (const page of staticPages) {
      xml += `  <url>
    <loc>${SITE_URL}${page.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    for (const product of allProducts) {
      const lastmod = product.updatedAt ? new Date(product.updatedAt).toISOString().split("T")[0] : now;
      const productIdentifier = product.slug || product.id;
      xml += `  <url>
    <loc>${SITE_URL}/products/${productIdentifier}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }

    const parentCategories = allCategories.filter(c => !c.parentId);
    for (const cat of parentCategories) {
      const lastmod = cat.updatedAt ? new Date(cat.updatedAt).toISOString().split("T")[0] : now;
      const slug = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      xml += `  <url>
    <loc>${SITE_URL}/products?category=${cat.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    }

    for (const brand of allBrands) {
      const lastmod = brand.updatedAt ? new Date(brand.updatedAt).toISOString().split("T")[0] : now;
      xml += `  <url>
    <loc>${SITE_URL}/products?brand=${brand.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    }

    xml += `</urlset>`;

    res.set("Content-Type", "application/xml");
    res.send(xml);
  } catch (error) {
    console.error("Error generating sitemap:", error);
    res.status(500).send("Error generating sitemap");
  }
});

router.get("/google-shopping.xml", async (req, res) => {
  try {
    const allProducts = await db.query.products.findMany({
      where: eq(products.isActive, true),
      with: {
        brand: true,
        category: true,
        subcategory: true,
      },
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>Pharma Oasis Product Feed</title>
  <link>${SITE_URL}</link>
  <description>B2B Pharmaceutical Wholesale - UK Licensed Distributor</description>
`;

    for (const product of allProducts) {
      // Use googleFeedPrice for Google Shopping (not displayed on website)
      // Fall back to wholesalePrice or rrp if no googleFeedPrice set
      const priceValue = (product as any).googleFeedPrice || product.wholesalePrice || product.rrp;
      const priceFormatted = priceValue ? `${parseFloat(priceValue).toFixed(2)} GBP` : null;
      
      // Skip products without a price - Google requires price
      if (!priceFormatted) continue;
      
      const availability = product.isActive ? "in_stock" : "out_of_stock";
      const condition = "new";
      const imageUrl = product.imageUrl?.startsWith("http") 
        ? product.imageUrl 
        : product.imageUrl 
          ? `${SITE_URL}${product.imageUrl}`
          : null;
      
      // Skip products without images - Google requires images
      if (!imageUrl) continue;
      
      const categoryPath = [
        product.category?.name,
        product.subcategory?.name
      ].filter(Boolean).join(" > ");

      const productIdentifier = (product as any).slug || product.id;
      
      // SKU is the EAN/GTIN for this business
      const gtin = product.sku;
      const hasValidGtin = gtin && gtin.length >= 8 && /^\d+$/.test(gtin);

      xml += `  <item>
    <g:id>${product.sku}</g:id>
    <g:title><![CDATA[${product.productName}]]></g:title>
    <g:description><![CDATA[${product.shortDescription || product.longDescription || product.productName}]]></g:description>
    <g:link>${SITE_URL}/products/${productIdentifier}</g:link>
    <g:image_link>${imageUrl}</g:image_link>
    <g:availability>${availability}</g:availability>
    <g:price>${priceFormatted}</g:price>
    <g:brand><![CDATA[${product.brand?.name || "Pharma Oasis"}]]></g:brand>
    <g:condition>${condition}</g:condition>
    ${hasValidGtin ? `<g:gtin>${gtin}</g:gtin>` : ""}
    <g:mpn>${product.sku}</g:mpn>
    <g:google_product_category>Health &amp; Beauty &gt; Health Care</g:google_product_category>
    <g:product_type><![CDATA[${categoryPath || "Health Care"}]]></g:product_type>
    <g:identifier_exists>${hasValidGtin || product.brand?.name ? "yes" : "no"}</g:identifier_exists>
  </item>
`;
    }

    xml += `</channel>
</rss>`;

    res.set("Content-Type", "application/xml");
    res.send(xml);
  } catch (error) {
    console.error("Error generating Google Shopping feed:", error);
    res.status(500).send("Error generating feed");
  }
});

router.get("/robots.txt", (req, res) => {
  const robots = `User-agent: *
Allow: /

Disallow: /admin/
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`;
  res.set("Content-Type", "text/plain");
  res.set("Cache-Control", "public, max-age=86400");
  res.send(robots);
});

export default router;
