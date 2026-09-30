import test from "node:test";
import assert from "node:assert/strict";
import {
  parseBuyingList,
  resolveBuyingList,
} from "../client/src/lib/buying-list.ts";
const product = {
  itemId: 1,
  description: "Example",
  ean: "0012345678901",
  price: 2,
  availability: "in_stock",
};
test("preserves leading zeroes and combines repeated EAN quantities", () => {
  assert.deepEqual(parseBuyingList("0012345678901, 6\n0012345678901\t12"), [
    { ean: "0012345678901", quantity: 18 },
  ]);
});
test("rejects malformed, fractional, oversized and empty lists", () => {
  for (const input of [
    "",
    "123,2",
    "0012345678901,1.2",
    "0012345678901,0",
    "0012345678901,-4",
    "0012345678901,100000",
    "0012345678901,99999\n0012345678901,1",
    "0012345678901,1,2",
    Array(51).fill("0012345678901,1").join("\n"),
  ])
    assert.throws(() => parseBuyingList(input));
});
test("matches exact EAN; retains account price or quote-only state", async () => {
  const lines = parseBuyingList("0012345678901,6");
  assert.equal(
    (await resolveBuyingList(lines, async () => [product]))[0].product.price,
    2,
  );
  assert.equal(
    (
      await resolveBuyingList(lines, async () => [{ ...product, price: null }])
    )[0].product.price,
    null,
  );
  await assert.rejects(
    resolveBuyingList(lines, async () => [
      { ...product, ean: "0012345678902" },
    ]),
    /not found/,
  );
});
test("aborts the entire import on an unmatched, ambiguous or out-of-stock line", async () => {
  const lines = parseBuyingList("0012345678901,6\n0012345678902,12");
  await assert.rejects(
    resolveBuyingList(lines, async (ean) =>
      ean === product.ean ? [product] : [],
    ),
    /Nothing has been added/,
  );
  await assert.rejects(
    resolveBuyingList(lines.slice(0, 1), async () => [
      product,
      { ...product, itemId: 2 },
    ]),
    /more than one match/,
  );
  await assert.rejects(
    resolveBuyingList(lines.slice(0, 1), async () => [
      { ...product, availability: "out_of_stock" },
    ]),
    /out of stock/,
  );
});
