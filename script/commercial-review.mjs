import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

// Explicit public fields only. This snapshot contains no supplier or customer prices.
export const catalogue = JSON.parse(gunzipSync(readFileSync(new URL("./review-data/commercial-catalogue.json.gz", import.meta.url))).toString("utf8"));
// Soft archives applied to the app after this snapshot was captured must also
// disappear from every review endpoint, including detail pages and brand counts.
const archivedIds = new Set(JSON.parse(readFileSync(new URL("./review-data/archived-product-ids.json", import.meta.url), "utf8")));
catalogue.products = catalogue.products.filter(p => !archivedIds.has(p.id));
for (const brand of catalogue.brands) {
  const products = catalogue.products.filter(p => p.brandId === brand.id);
  brand.productCount = products.length;
  brand.imageCount = products.filter(p => p.imageUrl).length;
}
const usedCategories = new Set(catalogue.products.map(p => p.categoryId));
catalogue.categories = catalogue.categories.filter(c => usedCategories.has(c.id));
catalogue.stats = {
  ...catalogue.stats,
  products: catalogue.products.length,
  brandsWithProducts: catalogue.brands.filter(b => b.productCount > 0).length,
  withImages: catalogue.products.filter(p => p.imageUrl).length,
  withoutImages: catalogue.products.filter(p => !p.imageUrl).length,
  temporaryReferences: catalogue.products.filter(p => !p.ean).length,
};
const normal = value => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const brands = new Map(catalogue.brands.map(b => [b.id, b]));
const categories = new Map(catalogue.categories.map(c => [c.id, c]));
const compareProducts = (a, b) => a.productName.localeCompare(b.productName) || a.id - b.id;
// Start with the current commercial selections, then rotate through the other
// brands. A fixed order keeps pagination stable between visits and requests.
const leadBrands = ["Myprotein", "Aveeno", "Nature's Aid", "BioGaia", "Hawkins & Brimble", "Myvitamins"].map(normal);
const brandRank = brandId => {
  const rank = leadBrands.indexOf(normal(brands.get(brandId)?.name));
  return rank < 0 ? leadBrands.length : rank;
};
function mixBrands(products) {
  const groups = new Map();
  for (const product of [...products].sort(compareProducts)) {
    if (!groups.has(product.brandId)) groups.set(product.brandId, []);
    groups.get(product.brandId).push(product);
  }
  const queues = [...groups.entries()].sort(([a, left], [b, right]) =>
    brandRank(a) - brandRank(b) || right.length - left.length || a - b
  ).map(([, products]) => products);
  const result = [];
  for (let row = 0; result.length < products.length; row++) {
    for (const queue of queues) if (queue[row]) result.push(queue[row]);
  }
  return result;
}
// Missing photographs affect presentation only, never catalogue eligibility.
const browseProducts = [
  ...mixBrands(catalogue.products.filter(p => p.imageUrl)),
  ...mixBrands(catalogue.products.filter(p => !p.imageUrl)),
];
export function selectProducts(query = {}) {
  const search = normal(query.search || query.q);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 24));
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const products = (search ? catalogue.products : browseProducts).filter(p =>
    (!query.brand || String(p.brandId) === String(query.brand)) &&
    (!query.category || String(p.categoryId) === String(query.category)) &&
    (!search || normal(`${p.productName} ${p.ean} ${p.sku} ${brands.get(p.brandId)?.name} ${categories.get(p.categoryId)?.name}`).includes(search))
  );
  // An exact barcode search must still find its product first, with or without a photo.
  if (search) products.sort((a, b) => Number(normal(b.ean) === search) - Number(normal(a.ean) === search) || compareProducts(a, b));
  return { products: products.slice((page - 1) * limit, page * limit), pagination: { page, pageSize: limit, total: products.length, totalPages: Math.ceil(products.length / limit) } };
}
export function mountCommercialReview(app) {
  app.get("/api/brands", (_req, res) => res.json(catalogue.brands));
  app.get("/api/categories", (_req, res) => res.json(catalogue.categories));
  app.get("/api/featured-brands", (_req, res) => res.json([]));
  // The catalogue is paginated separately. Brand pages and campaign artwork
  // need only the taxonomy/counts and approved photographed products.
  app.get("/api/review/commercial-range", (_req, res) => res.json({ ...catalogue, products: catalogue.products.filter(p => p.imageUrl) }));
  app.get("/api/products/search", (req, res) => res.json(selectProducts(req.query).products));
  app.get("/api/products", (req, res) => res.json(selectProducts(req.query)));
  app.get("/api/products/:idOrSlug", (req, res) => {
    const product = catalogue.products.find(p => String(p.id) === req.params.idOrSlug || p.slug === req.params.idOrSlug);
    return product ? res.json(product) : res.status(404).json({ message: "This product is not in the reviewed commercial range." });
  });
  // Legacy offers must not reintroduce unrelated products or retail prices in this review.
  app.get("/api/offers", (_req, res) => res.json([]));
  app.get("/api/offers/*", (_req, res) => res.status(404).json({ message: "See the weekly brand selections." }));
}
