import test from "node:test";
import assert from "node:assert/strict";
import { signCostSource, verifyCostSource } from "../server/quote-price-source";
import { customerQuoteView, customerLineView, validCost, sellingPriceFromMarkup, type CostOption } from "../shared/trade-intelligence";
import { quoteVersionLine } from "../shared/quote-lines";
import { fetchInventoryIntelligence } from "../server/inventory-intelligence";

const now = Date.parse("2026-09-30T20:00:00Z");
const key = "isolated-unit-test-key";
const cost: CostOption = { source: "supplier_price", ean: "0034268009050", productRef: 42,
  unitCost: "4.99", currency: "GBP", supplierId: 9, supplierName: "Fixture supplier",
  reference: "Fixture offer", priceDate: "2026-09-29T00:00:00Z", fetchedAt: new Date(now).toISOString() };

test("applied cost has a verified source, correct EAN and persistent historical snapshot", () => {
  const token = signCostSource(24, cost, key)!;
  const snapshot = verifyCostSource(token, 24, cost.ean, 4.99, 3, key, now);
  assert.equal(snapshot.ean, "0034268009050");
  assert.equal(snapshot.supplierName, "Fixture supplier");
  assert.equal(snapshot.appliedBy, 3);
  assert.equal("quoteId" in snapshot, false);
  const next = quoteVersionLine({ id: 1, quoteId: 24, createdAt: new Date(now), pricingSource: snapshot, unitCost: "4.99", unitPrice: "6.49" }, 25);
  assert.deepEqual(next.pricingSource, snapshot);
  assert.equal(next.unitPrice, "6.49");
});

test("another quote, another EAN, changed cost, tampering and expired lookups cannot claim a source", () => {
  const token = signCostSource(24, cost, key)!;
  assert.throws(() => verifyCostSource(token, 25, cost.ean, 4.99, 3, key, now));
  assert.throws(() => verifyCostSource(token, 24, "5034268009050", 4.99, 3, key, now));
  assert.throws(() => verifyCostSource(token, 24, cost.ean, 3.99, 3, key, now));
  assert.throws(() => verifyCostSource(token + "x", 24, cost.ean, 4.99, 3, key, now));
  assert.throws(() => verifyCostSource(token, 24, cost.ean, 4.99, 3, key, now + 86400001));
});

test("missing, zero, invalid and foreign-currency costs are never applied automatically as GBP", () => {
  for (const unitCost of ["", "0", "-1", "NaN", "Infinity"]) assert.equal(validCost({ unitCost, currency: "GBP" }), false);
  assert.equal(signCostSource(24, { ...cost, currency: "EUR" }, key), undefined);
  assert.equal(sellingPriceFromMarkup("4.99", "20"), "5.99");
  assert.equal(sellingPriceFromMarkup("", "20"), null);
  assert.equal(sellingPriceFromMarkup("4.99", ""), null);
  assert.equal(sellingPriceFromMarkup("4.99", "-20"), null);
});

test("customer quotes and order lines hide supplier costs, margin, provenance and nested catalogue costs", () => {
  const line = { id: 1, ean: cost.ean, description: "Product", quantity: 12, unitPrice: "6.49", unitCost: "4.99",
    marginApplied: "30", pricingSource: cost, sourceToken: "secret", lineTotal: "77.88", product: { id: 42, productName: "Product", costPrice: "4.99", activeCostPrice: "4.99" } };
  const quote = customerQuoteView({ id: 24, adminNotes: "Internal", inventoryPushError: "Private", items: [line] });
  const serialized = JSON.stringify(quote);
  for (const secret of ["4.99", "marginApplied", "pricingSource", "sourceToken", "Internal", "Private"]) assert.ok(!serialized.includes(secret));
  assert.equal(quote.items[0].ean, cost.ean);
  assert.equal(customerLineView(line).unitPrice, "6.49");
});

test("inventory HTTP lookup sends only a backend credential and fails clearly without fabricated prices", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.INVENTORY_INTELLIGENCE_URL;
  const originalToken = process.env.INVENTORY_INTELLIGENCE_TOKEN;
  process.env.INVENTORY_INTELLIGENCE_URL = "https://inventory.example.test";
  process.env.INVENTORY_INTELLIGENCE_TOKEN = key;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(new URL(String(url)).searchParams.get("ean"), cost.ean);
      assert.equal(new URL(String(url)).searchParams.get("customerRef"), "7");
      assert.equal((options?.headers as any).Authorization, `Bearer ${key}`);
      return new Response(JSON.stringify({ product: { id: 42, ean: cost.ean }, fetchedAt: cost.fetchedAt,
        inventory: { onHand: 9, allocated: 24, available: -15, incoming: 0 }, supplierPrices: [{ ...cost, id: 1 }],
        lastPurchase: null, pricing: null }), { status: 200 });
    };
    const result = await fetchInventoryIntelligence(24, cost.ean, 7);
    assert.equal(result.inventory.available, -15);
    assert.equal(result.costOptions.length, 1);
    assert.ok(result.costOptions[0].token);
    assert.ok(!JSON.stringify(result).includes(key));
    globalThis.fetch = async () => new Response("{}", { status: 404 });
    await assert.rejects(fetchInventoryIntelligence(24, cost.ean, null), /No inventory product/);
    globalThis.fetch = async () => { throw new Error("secret upstream connection"); };
    await assert.rejects(fetchInventoryIntelligence(24, cost.ean, null), /timed out or is unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.INVENTORY_INTELLIGENCE_URL; else process.env.INVENTORY_INTELLIGENCE_URL = originalUrl;
    if (originalToken === undefined) delete process.env.INVENTORY_INTELLIGENCE_TOKEN; else process.env.INVENTORY_INTELLIGENCE_TOKEN = originalToken;
  }
});
