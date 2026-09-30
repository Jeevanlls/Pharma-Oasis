import { readFileSync } from "node:fs";

// Explicit public fields only. This snapshot contains no supplier or customer prices.
export const catalogue = JSON.parse(readFileSync(new URL("./review-data/commercial-catalogue.json", import.meta.url), "utf8"));
const normal = value => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const brands = new Map(catalogue.brands.map(b => [b.id, b]));
const categories = new Map(catalogue.categories.map(c => [c.id, c]));
export function selectProducts(query = {}) {
  const search = normal(query.search || query.q);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 24));
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const products = catalogue.products.filter(p =>
    (!query.brand || String(p.brandId) === String(query.brand)) &&
    (!query.category || String(p.categoryId) === String(query.category)) &&
    (!search || normal(`${p.productName} ${p.ean} ${p.sku} ${brands.get(p.brandId)?.name} ${categories.get(p.categoryId)?.name}`).includes(search))
  ).sort((a, b) => Number(normal(b.ean) === search) - Number(normal(a.ean) === search) || a.productName.localeCompare(b.productName) || a.id - b.id);
  return { products: products.slice((page - 1) * limit, page * limit), pagination: { page, pageSize: limit, total: products.length, totalPages: Math.ceil(products.length / limit) } };
}
export function mountCommercialReview(app) {
  app.get("/api/brands", (_req, res) => res.json(catalogue.brands));
  app.get("/api/categories", (_req, res) => res.json(catalogue.categories));
  app.get("/api/featured-brands", (_req, res) => res.json([]));
  app.get("/api/review/commercial-range", (_req, res) => res.json(catalogue));
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
