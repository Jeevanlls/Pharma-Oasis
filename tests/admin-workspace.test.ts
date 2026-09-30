import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { registerWorkspaceRoutes } from "../server/admin-workspace";
import { workspaceLike, workspaceSearchTerm } from "../shared/admin-workspace";
import { adminSectionFor, adminSections, routeIsActive } from "../client/src/lib/admin-navigation";

test("workspace navigation keeps nested deal routes and specialist pricing routes in the right group", () => {
  assert.equal(adminSectionFor("/admin/sales/quote/18").key, "sales");
  assert.equal(adminSectionFor("/admin/pricing-categories").key, "pricing");
  assert.equal(adminSectionFor("/admin/suppliers").key, "accounts");
  assert.equal(routeIsActive("/admin/accounts", "/admin"), false);
  assert.equal(adminSections.length, 7);
  const links = adminSections.flatMap(section => section.links.map(link => link.href));
  assert.equal(new Set(links).size, links.length);
});

test("search keeps leading zeroes and treats SQL wildcard characters literally", () => {
  assert.equal(workspaceSearchTerm(" 0000123456789 "), "0000123456789");
  assert.equal(workspaceSearchTerm("ab"), null);
  assert.equal(workspaceSearchTerm(["EAN"]), null);
  assert.equal(workspaceSearchTerm("a".repeat(81)), null);
  assert.equal(workspaceLike("50%_\\"), "%50\\%\\_\\\\%");
});

test("search routes enforce admin middleware, validate input and bind values without leaking data", async () => {
  const calls: { sql: string; params: any[] }[] = [];
  let fail = false;
  const app = express();
  registerWorkspaceRoutes(app, (req, res, next) => {
    if (req.headers["x-test-role"] !== "admin") return res.sendStatus(req.headers["x-test-role"] ? 403 : 401);
    next();
  }, { query: async (sql, params) => {
    calls.push({ sql, params });
    if (fail) throw new Error("private database connection details");
    return { rows: [{ id: 7, label: "Example", email: "fiction@example.invalid", country: "UK", status: "pending", ean: "0000123456789", brand: "Example", passwordHash: "must-not-leak" }] };
  } });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address() as { port: number };
  const root = `http://127.0.0.1:${address.port}`;
  const request = (route: string, role?: string) => fetch(root + route, { headers: role ? { "x-test-role": role } : {} });
  try {
    for (const route of ["search", "sales-matches"]) {
      assert.equal((await request(`/api/admin/workspace/${route}?q=505`)).status, 401);
      assert.equal((await request(`/api/admin/workspace/${route}?q=505`, "customer")).status, 403);
      assert.equal((await request(`/api/admin/workspace/${route}?q=ab`, "admin")).status, 400);
      assert.equal((await request(`/api/admin/workspace/${route}?q[]=EAN`, "admin")).status, 400);
    }
    assert.equal(calls.length, 0);
    const term = "%' OR TRUE --";
    const result = await request(`/api/admin/workspace/search?q=${encodeURIComponent(term)}`, "admin");
    assert.equal(result.status, 200);
    assert.equal(result.headers.get("cache-control"), "no-store");
    const rows = await result.json();
    assert.equal(rows.length, 5);
    assert.ok(rows.every((row: any) => row.href.startsWith("/admin/")));
    assert.ok(calls.every(call => call.params[0] === workspaceLike(term) && !call.sql.includes(term)));
    assert.doesNotMatch(JSON.stringify(rows), /must-not-leak|passwordHash/);
    const matches = await request("/api/admin/workspace/sales-matches?q=0000123", "admin");
    assert.deepEqual(await matches.json(), { quotes: [7], orders: [7] });
    fail = true;
    const error = await request("/api/admin/workspace/search?q=505", "admin");
    assert.equal(error.status, 500);
    assert.doesNotMatch(await error.text(), /private database/);
  } finally { server.closeAllConnections(); server.close(); }
});
