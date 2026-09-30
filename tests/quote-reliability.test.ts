import test from "node:test";
import assert from "node:assert/strict";
import { quoteEan, quoteLineIdentity, quoteVersionLine, quoteTotalLabel } from "../shared/quote-lines";
import { quoteEmailLines } from "../server/quote-email-content";
import { quoteEmailOutcome } from "../server/quote-outbox-sql";

test("legacy quote recovers its EAN without changing financial snapshots", () => {
  const line = { ean: null, description: null, quantity: 24, unitPrice: "2.35", unitCost: "1.23", lineTotal: "56.40" };
  const got = quoteLineIdentity(line, { ean: " 0000123456789 ", productName: "Linked product" });
  assert.equal(got.ean, "0000123456789");
  assert.equal(got.description, "Linked product");
  for (const key of ["quantity", "unitPrice", "unitCost", "lineTotal"] as const) assert.equal(got[key], line[key]);
});

test("historic identity wins over current catalogue and list descriptions", () => {
  assert.deepEqual(quoteLineIdentity({ ean: "0000123456789", description: "Quoted pack" },
    { ean: "5000488107623", productName: "Current pack" }), { ean: "0000123456789", description: "Quoted pack" });
  assert.equal(quoteLineIdentity({ ean: " ", description: "" }, undefined,
    { ean: "5000488107623", description: "Price-list-only line" }).ean, "5000488107623");
  assert.equal(quoteEan(123456789), null);
  assert.equal(quoteEan("50004\n88107623"), "5000488107623");
});

test("a new quote version keeps catalogue and price-list identities and every price field", () => {
  const original = { id: 1, quoteId: 2, createdAt: new Date(), productId: 7, priceListItemId: 8,
    ean: "0000123456789", description: "Original pack", quantity: 24, unitPrice: "2.35",
    unitCost: "1.23", marginApplied: "91.06", lineTotal: "56.40" };
  const copy = quoteVersionLine(original, 3);
  assert.equal(copy.quoteId, 3);
  assert.equal("id" in copy, false);
  assert.equal("createdAt" in copy, false);
  for (const key of ["productId", "priceListItemId", "ean", "description", "quantity", "unitPrice", "unitCost", "marginApplied", "lineTotal"] as const)
    assert.equal(copy[key], original[key]);
});

test("an unpriced request is never described as a free £0 quote", () => {
  assert.match(quoteTotalLabel([{ unitPrice: null }], 0), /Price on request/);
  assert.match(quoteTotalLabel([{ unitPrice: "1.00" }, { unitPrice: null }], 1), /sales team to confirm/);
  assert.equal(quoteTotalLabel([{ unitPrice: 0 }], 0), "£0.00");
});

test("email product table keeps EANs, quantities and safely escapes supplied text", () => {
  const body = quoteEmailLines([{ ean: "0000123456789", description: '<img src=x onerror="bad">', quantity: 12 }]);
  assert.match(body, /0000123456789/);
  assert.match(body, /Quantity \(units\)/);
  assert.match(body, />12<\/td>/);
  assert.doesNotMatch(body, /<img/);
  assert.match(body, /&lt;img/);
});

test("email failures are retried with bounded backoff, then require attention", () => {
  assert.deepEqual(quoteEmailOutcome(false, 1), { status: "pending", delay: 60 });
  assert.equal(quoteEmailOutcome(false, 5).status, "pending");
  assert.equal(quoteEmailOutcome(false, 6).status, "failed");
  assert.deepEqual(quoteEmailOutcome(true, 2), { status: "sent", delay: 0 });
});
