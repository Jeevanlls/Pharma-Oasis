import test from "node:test";
import assert from "node:assert/strict";
import { createPreviewApp } from "../script/review-preview.mjs";
test("preview blocks every write and private API; only forwards anonymous allowed reads", async () => {
  const calls = [];
  const app = createPreviewApp(async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify({ products: [] }), {
      headers: { "content-type": "application/json" },
    });
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"])
      assert.equal(
        (
          await fetch(base + "/api/portal/orders", {
            method,
            body: "test",
            headers: { Cookie: "private=test" },
          })
        ).status,
        403,
      );
    for (const pathname of [
      "/api/admin/users",
      "/api/portal/orders",
      "/api/portal/products",
      "/api/auth/login",
      "/api/unknown",
    ])
      assert.equal((await fetch(base + pathname)).status, 403);
    assert.equal(calls.length, 0);
    assert.deepEqual(await (await fetch(base + "/api/auth/me")).json(), {
      user: null,
    });
    const response = await fetch(
      base + "/api/products?search=Vitabiotics&token=private",
      { headers: { Cookie: "private=test", Authorization: "Bearer test" } },
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get("x-robots-tag"), /noindex/);
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      "https://pharmaoasis.co.uk/api/products?search=Vitabiotics",
    );
    assert.deepEqual(Object.keys(calls[0].options.headers), ["Accept"]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
