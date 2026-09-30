// Run only against a disposable database branch after the catalogue rehearsal.
// The verifier calls the real route handlers and storage queries without starting
// import, mail, customer-sync or other background processes.
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";

assert.equal(process.env.CATALOGUE_TEST_BRANCH_ID, "br-sweet-sky-abn97nfu");
assert.equal(new URL(process.env.NEON_DATABASE_URL ?? "").hostname, "ep-wandering-rice-abq0zldm-pooler.eu-west-2.aws.neon.tech",
  "Only the explicitly named disposable test endpoint is allowed");
const { db } = await import("../server/db");
const { registerRoutes } = await import("../server/routes");

const rowsOf = (result: any): any[] => Array.isArray(result) ? result : result.rows;
const branchResult = await db.execute(sql`SELECT current_setting('neon.branch_id') AS branch`);
const branch = rowsOf(branchResult)[0]?.branch ?? rowsOf(branchResult)[0]?.[0];
assert.equal(branch, process.env.CATALOGUE_TEST_BRANCH_ID, "Explicit test branch must match");
assert.notEqual(branch, "br-late-math-abxtg3os", "Never run rehearsal tests on production");

const handlers = new Map<string, Function>();
const app = {
  set() {}, use() {},
  get(path: string, ...fns: Function[]) { handlers.set(path, fns[fns.length - 1]); },
  post() {}, put() {}, patch() {}, delete() {},
};
await registerRoutes({} as any, app as any);
async function get(path: string, query: Record<string, string> = {}, params: Record<string, string> = {}) {
  let status = 200; let body: any;
  const response: any = { status(n: number) { status = n; return response; }, set() { return response; }, json(x: any) { body = x; return response; } };
  await handlers.get(path)!({ query, params }, response);
  return { status, body };
}

const first = await get('/api/products', { limit: '100' });
assert.equal(first.status, 200); assert.equal(first.body.pagination.total, 9876);
assert.equal(first.body.products.length, 100);
const second = await get('/api/products', { limit: '100', page: '2' });
assert.equal(new Set([...first.body.products, ...second.body.products].map((p: any) => p.id)).size, 200);

const sample = first.body.products[0];
const combined = await get('/api/products', { search: sample.ean, brand: String(sample.brandId), category: String(sample.categoryId) });
assert.equal(combined.status, 200); assert.equal(combined.body.pagination.total, 1);
assert.equal(combined.body.products[0].id, sample.id);
const mismatch = await get('/api/products', { search: sample.ean, brand: '2147483647', category: String(sample.categoryId) });
assert.equal(mismatch.body.pagination.total, 0); assert.deepEqual(mismatch.body.products, []);
const filtered = await get('/api/products', { brand: String(sample.brandId), category: String(sample.categoryId), limit: '100' });
assert(filtered.body.products.every((p: any) => p.brandId === sample.brandId && (p.categoryId === sample.categoryId || p.subcategoryId === sample.categoryId)));

for (const id of ['810', '1070', '1884', '1885', '10049', '10051', '10053', '10055', '10897', '10898', '11518', '11592', '118']) {
  assert.equal((await get('/api/products/:idOrSlug', {}, { idOrSlug: id })).status, 404);
}
for (const q of ['783318801674', 'J98272N', '9781922417442']) {
  assert.deepEqual((await get('/api/products/search', { q })).body, []);
}
for (const query of [{ limit: '-1' }, { page: 'NaN' }, { brand: '1.5' }, { category: '0' }, { offset: '-2' }]) {
  assert.equal((await get('/api/products', query)).status, 400);
}

const facetBrands = (await get('/api/brands')).body;
const facetCategories = (await get('/api/categories')).body;
const used = await db.execute(sql`SELECT DISTINCT brand_id,category_id,subcategory_id FROM products WHERE is_active`);
const usedRows: any[] = rowsOf(used);
const brandIds = new Set(usedRows.map(r => Number(r.brand_id ?? r[0])));
const categoryIds = new Set(usedRows.flatMap(r => [Number(r.category_id ?? r[1]), Number(r.subcategory_id ?? r[2])]));
assert(facetBrands.every((b: any) => brandIds.has(b.id)));
assert(facetCategories.every((c: any) => categoryIds.has(c.id)));
assert.equal(facetBrands.length, 1447);

const offers = await db.execute(sql`SELECT DISTINCT offer_id FROM offer_items WHERE product_id=11592`);
for (const offer of rowsOf(offers)) {
  const offerId = String(offer.offer_id ?? offer[0]);
  const result = await get('/api/offers/:idOrSlug/items', {}, { idOrSlug: offerId });
  assert.equal(result.status, 200); assert(!result.body.some((x: any) => x.product.id === 11592));
}
console.log(JSON.stringify({ passed: true, activeProducts: 9876, brands: facetBrands.length, categories: facetCategories.length, checks: ['combined filters and counts', 'stable pagination', 'EAN search', 'inactive details/autocomplete/offers', 'input validation', 'facets with live products'] }));
process.exit(0);
