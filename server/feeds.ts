import { Router } from "express";
import { db } from "./db";
import { products, brands, categories, blogPosts } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

const SITE_URL = process.env.SITE_URL || "https://pharmaoasis.co.uk";
const PRODUCTS_PER_SITEMAP = 10000;

let sitemapCache: { data: string; timestamp: number } | null = null;
let productSitemapCache: Map<number, { data: string; timestamp: number }> = new Map();
const CACHE_TTL = 3600000;

router.get("/sitemap.xml", async (req, res) => {
  try {
    const productCount = await db.select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.isActive, true));
    
    const totalProducts = Number(productCount[0]?.count || 0);
    const sitemapCount = Math.ceil(totalProducts / PRODUCTS_PER_SITEMAP);
    
    if (sitemapCount <= 1 && totalProducts <= 1000) {
      return generateSingleSitemap(req, res);
    }
    
    const now = new Date().toISOString();
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/feeds/sitemap-static.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/feeds/sitemap-brands.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/feeds/sitemap-categories.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/feeds/sitemap-blog.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
`;
    
    for (let i = 0; i < sitemapCount; i++) {
      xml += `  <sitemap>
    <loc>${SITE_URL}/feeds/sitemap-products-${i + 1}.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
`;
    }
    
    xml += `</sitemapindex>`;
    
    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (error) {
    console.error("Error generating sitemap index:", error);
    res.status(500).send("Error generating sitemap");
  }
});

async function generateSingleSitemap(req: any, res: any) {
  if (sitemapCache && Date.now() - sitemapCache.timestamp < CACHE_TTL) {
    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=3600");
    return res.send(sitemapCache.data);
  }
  
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
    { loc: "/blog", priority: "0.7", changefreq: "weekly" },
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

  sitemapCache = { data: xml, timestamp: Date.now() };
  
  res.set("Content-Type", "application/xml");
  res.set("Cache-Control", "public, max-age=3600");
  res.send(xml);
}

router.get("/sitemap-static.xml", async (req, res) => {
  try {
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

    xml += `</urlset>`;

    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=86400");
    res.send(xml);
  } catch (error) {
    console.error("Error generating static sitemap:", error);
    res.status(500).send("Error generating sitemap");
  }
});

router.get("/sitemap-brands.xml", async (req, res) => {
  try {
    const allBrands = await db.select({ id: brands.id, name: brands.name, slug: brands.slug, updatedAt: brands.updatedAt })
      .from(brands)
      .where(eq(brands.isActive, true));

    const now = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

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
    res.set("Cache-Control", "public, max-age=86400");
    res.send(xml);
  } catch (error) {
    console.error("Error generating brands sitemap:", error);
    res.status(500).send("Error generating sitemap");
  }
});

router.get("/sitemap-categories.xml", async (req, res) => {
  try {
    const allCategories = await db.select({ id: categories.id, name: categories.name, slug: categories.slug, parentId: categories.parentId, updatedAt: categories.updatedAt })
      .from(categories)
      .where(eq(categories.isActive, true));

    const now = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    for (const cat of allCategories) {
      const lastmod = cat.updatedAt ? new Date(cat.updatedAt).toISOString().split("T")[0] : now;
      xml += `  <url>
    <loc>${SITE_URL}/products?category=${cat.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    }

    xml += `</urlset>`;

    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=86400");
    res.send(xml);
  } catch (error) {
    console.error("Error generating categories sitemap:", error);
    res.status(500).send("Error generating sitemap");
  }
});

router.get("/sitemap-blog.xml", async (req, res) => {
  try {
    const allPosts = await db.select({ 
      id: blogPosts.id, 
      slug: blogPosts.slug, 
      updatedAt: blogPosts.updatedAt,
      publishedAt: blogPosts.publishedAt
    })
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"));

    const now = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/blog</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;

    for (const post of allPosts) {
      const lastmod = post.updatedAt ? new Date(post.updatedAt).toISOString().split("T")[0] : 
                      post.publishedAt ? new Date(post.publishedAt).toISOString().split("T")[0] : now;
      xml += `  <url>
    <loc>${SITE_URL}/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    }

    xml += `</urlset>`;

    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=86400");
    res.send(xml);
  } catch (error) {
    console.error("Error generating blog sitemap:", error);
    res.status(500).send("Error generating sitemap");
  }
});

router.get("/sitemap-products-:page.xml", async (req, res) => {
  try {
    const page = parseInt(req.params.page, 10);
    if (isNaN(page) || page < 1) {
      return res.status(400).send("Invalid page number");
    }
    
    const cached = productSitemapCache.get(page);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.set("Content-Type", "application/xml");
      res.set("Cache-Control", "public, max-age=3600");
      return res.send(cached.data);
    }

    const offset = (page - 1) * PRODUCTS_PER_SITEMAP;
    
    const pageProducts = await db.select({ id: products.id, sku: products.sku, slug: products.slug, updatedAt: products.updatedAt })
      .from(products)
      .where(eq(products.isActive, true))
      .limit(PRODUCTS_PER_SITEMAP)
      .offset(offset);

    if (pageProducts.length === 0) {
      return res.status(404).send("Sitemap page not found");
    }

    const now = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    for (const product of pageProducts) {
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

    xml += `</urlset>`;

    productSitemapCache.set(page, { data: xml, timestamp: Date.now() });

    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (error) {
    console.error("Error generating products sitemap:", error);
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
      const priceValue = (product as any).googleFeedPrice || product.wholesalePrice || product.rrp;
      const priceFormatted = priceValue ? `${parseFloat(priceValue).toFixed(2)} GBP` : null;
      
      if (!priceFormatted) continue;
      
      const availability = product.isActive ? "in_stock" : "out_of_stock";
      const condition = "new";
      const imageUrl = product.imageUrl?.startsWith("http") 
        ? product.imageUrl 
        : product.imageUrl 
          ? `${SITE_URL}${product.imageUrl}`
          : null;
      
      if (!imageUrl) continue;
      
      const categoryPath = [
        product.category?.name,
        product.subcategory?.name
      ].filter(Boolean).join(" > ");

      const productIdentifier = (product as any).slug || product.id;
      
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
    res.set("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (error) {
    console.error("Error generating Google Shopping feed:", error);
    res.status(500).send("Error generating feed");
  }
});

router.get("/robots.txt", (req, res) => {
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/

Sitemap: ${SITE_URL}/sitemap.xml
`;

  res.set("Content-Type", "text/plain");
  res.set("Cache-Control", "public, max-age=86400");
  res.send(robotsTxt);
});

export default router;
