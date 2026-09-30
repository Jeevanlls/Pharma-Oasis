import type { Express, RequestHandler } from "express";
import { workspaceLike, workspaceSearchTerm, type WorkspaceSearchResult } from "../shared/admin-workspace";

type Database = { query: (sql: string, params: any[]) => Promise<{ rows: any[] }> };

// Only fixed SQL identifiers are interpolated. Search input is always a bound value.
const dealQuery = (kind: "quote" | "order") => {
  const table = kind === "quote" ? "quotes" : "orders";
  const items = kind === "quote" ? "quote_items" : "order_items";
  const foreignKey = kind === "quote" ? "quote_id" : "order_id";
  const prefix = kind === "quote" ? "Q-" : "O-";
  return `SELECT d.id, d.status, COALESCE(NULLIF(u.company_name,''), u.email, 'Customer') AS label,
    d.created_at FROM ${table} d LEFT JOIN users u ON u.id=d.user_id
    WHERE ('${prefix}' || d.id::text) ILIKE $1 OR u.company_name ILIKE $1 OR u.email ILIKE $1
      OR EXISTS (SELECT 1 FROM ${items} i
        LEFT JOIN products p ON p.id=i.product_id
        LEFT JOIN price_list_items li ON li.id=i.price_list_item_id
        WHERE i.${foreignKey}=d.id AND (
          COALESCE(NULLIF(BTRIM(i.ean),''),NULLIF(BTRIM(p.ean),''),NULLIF(BTRIM(li.ean),''),'') ILIKE $1
          OR COALESCE(NULLIF(i.description,''),p.product_name,li.description,'') ILIKE $1))
    ORDER BY d.created_at DESC, d.id DESC`;
};

export const workspaceQuoteSearchSql = dealQuery("quote");
export const workspaceOrderSearchSql = dealQuery("order");
export const workspaceProductSearchSql = `SELECT p.id,p.product_name AS label,p.ean,b.name AS brand
  FROM products p LEFT JOIN brands b ON b.id=p.brand_id LEFT JOIN categories c ON c.id=p.category_id
  WHERE p.product_name ILIKE $1 OR p.ean ILIKE $1 OR b.name ILIKE $1 OR c.name ILIKE $1
  ORDER BY (p.ean=$2) DESC NULLS LAST, p.product_name, p.id LIMIT 6`;
export const workspaceCustomerSearchSql = `SELECT id,COALESCE(NULLIF(company_name,''),email) AS label,
  email,status FROM users WHERE role='customer' AND
  (company_name ILIKE $1 OR email ILIKE $1 OR primary_contact_name ILIKE $1)
  ORDER BY company_name,id LIMIT 4`;
export const workspaceSupplierSearchSql = `SELECT id,company_name AS label,country,status
  FROM supplier_leads WHERE company_name ILIKE $1 OR email ILIKE $1 OR contact_name ILIKE $1
  ORDER BY company_name,id LIMIT 4`;

export function registerWorkspaceRoutes(app: Express, requireAdmin: RequestHandler, database: Database) {
  app.get("/api/admin/workspace/search", requireAdmin, async (req, res) => {
    res.set("Cache-Control", "no-store");
    const term = workspaceSearchTerm(req.query.q);
    if (!term) return res.status(400).json({ message: "Search must contain 3 to 80 characters." });
    const pattern = workspaceLike(term);
    try {
      const [products, customers, suppliers, quotes, orders] = await Promise.all([
        database.query(workspaceProductSearchSql, [pattern, term]),
        database.query(workspaceCustomerSearchSql, [pattern]),
        database.query(workspaceSupplierSearchSql, [pattern]),
        database.query(workspaceQuoteSearchSql + " LIMIT 4", [pattern]),
        database.query(workspaceOrderSearchSql + " LIMIT 4", [pattern]),
      ]);
      const rows: WorkspaceSearchResult[] = [
        ...quotes.rows.map(row => ({ kind: "Quote" as const, id: row.id, label: row.label, detail: `Q-${row.id} · ${row.status}`, href: `/admin/sales/quote/${row.id}` })),
        ...orders.rows.map(row => ({ kind: "Order" as const, id: row.id, label: row.label, detail: `O-${row.id} · ${row.status}`, href: `/admin/sales/order/${row.id}` })),
        ...customers.rows.map(row => ({ kind: "Customer" as const, id: row.id, label: row.label, detail: row.email, href: `/admin/users?review=${row.id}` })),
        ...suppliers.rows.map(row => ({ kind: "Supplier" as const, id: row.id, label: row.label, detail: `${row.country} · ${row.status}`, href: `/admin/suppliers?review=${row.id}` })),
        ...products.rows.map(row => ({ kind: "Product" as const, id: row.id, label: row.label, detail: [row.brand, row.ean].filter(Boolean).join(" · "), href: `/admin/products?search=${encodeURIComponent(row.ean || row.label)}` })),
      ];
      res.json(rows);
    } catch {
      res.status(500).json({ message: "Workspace search is temporarily unavailable." });
    }
  });

  app.get("/api/admin/workspace/sales-matches", requireAdmin, async (req, res) => {
    res.set("Cache-Control", "no-store");
    const term = workspaceSearchTerm(req.query.q);
    if (!term) return res.status(400).json({ message: "Search must contain 3 to 80 characters." });
    try {
      const pattern = workspaceLike(term);
      const [quotes, orders] = await Promise.all([
        database.query(workspaceQuoteSearchSql, [pattern]),
        database.query(workspaceOrderSearchSql, [pattern]),
      ]);
      res.json({ quotes: quotes.rows.map(row => row.id), orders: orders.rows.map(row => row.id) });
    } catch {
      res.status(500).json({ message: "Product search could not load." });
    }
  });
}
