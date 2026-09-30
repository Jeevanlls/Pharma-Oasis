import { pool } from "./db";
import { publicProduct } from "@shared/public-catalogue";
import { storage } from "./storage";
let cache: {
    at: number;
    data: any;
} | null = null;
export async function commercialRange() {
    if (cache && Date.now() - cache.at < 60000)
        return cache.data;
    const brands = await pool.query(`WITH names AS(SELECT regexp_replace(lower(name),'[^a-z0-9]','','g') name FROM pricing_brands WHERE pm_brand_id IS NOT NULL AND is_active),
    commercial AS(SELECT b.* FROM brands b WHERE b.is_active AND regexp_replace(lower(b.name),'[^a-z0-9]','','g') IN(SELECT name FROM names))
    SELECT b.id,b.name,count(p.id)::integer AS "productCount",count(p.id) FILTER(WHERE nullif(p.image_url,'') IS NOT NULL)::integer AS "imageCount"
    FROM commercial b LEFT JOIN products p ON p.brand_id=b.id AND p.is_active GROUP BY b.id,b.name ORDER BY lower(b.name)`);
    const offers = await storage.getActiveOffers();
    const allItems = await Promise.all(offers.map(o => storage.getOfferItems(o.id)));
    const products = new Map<number, any>();
    const campaigns = offers.map((o, i) => {
        const items = allItems[i].filter(x => x.product?.isActive && x.product?.imageUrl);
        items.forEach(x => products.set(x.product.id, publicProduct(x.product)));
        const start = new Date(o.startDate).toLocaleDateString("en-CA", { timeZone: "Europe/London" });
        const end = new Date(o.endDate).toLocaleDateString("en-CA", { timeZone: "Europe/London" });
        return { id: o.slug || String(o.id), brandIds: Array.from(new Set(allItems[i].filter(x => x.product?.isActive).map(x => x.product.brandId))), productIds: items.slice(0, 3).map(x => x.product.id),
            title: o.title, description: o.description || "Request a quotation for your business.", tone: ["lime", "oat", "rose", "peach", "stone"].includes(o.badgeColor || "") ? o.badgeColor : "oat", start, end, enabled: o.isActive };
    }).filter(c => c.productIds.length > 0);
    cache = { at: Date.now(), data: { capturedAt: new Date().toISOString(), brands: brands.rows, products: Array.from(products.values()), campaigns } };
    return cache.data;
}
