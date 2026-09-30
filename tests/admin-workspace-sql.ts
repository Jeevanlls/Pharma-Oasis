// Read-only PostgreSQL integration cases. Every relation is a fictional CTE;
// these statements never access application records or change database state.
import { workspaceQuoteSearchSql, workspaceOrderSearchSql, workspaceProductSearchSql } from "../server/admin-workspace";
import { workspaceLike } from "../shared/admin-workspace";

const fixtures = `WITH
users(id,company_name,email) AS (VALUES (1,'Example Pharmacy','buyer@example.invalid')),
brands(id,name) AS (VALUES (1,'Example Wellness')),
categories(id,name) AS (VALUES (1,'Vitamins')),
products(id,product_name,ean,brand_id,category_id) AS (VALUES
 (1,'Vitamin C','0012345678905',1,1),(2,'Vitamin D','0099999999999',1,1)),
price_list_items(id,ean,description) AS (VALUES (1,'0077777777777','Price list product')),
quotes(id,user_id,status,created_at) AS (VALUES
 (10,1,'pending','2026-09-30'::timestamp),(11,1,'pending','2026-09-29'::timestamp),
 (12,1,'quoted','2026-09-28'::timestamp),(13,1,'quoted','2026-09-27'::timestamp)),
quote_items(quote_id,product_id,price_list_item_id,ean,description) AS (VALUES
 (10,1,NULL::integer,'0088888888888','Original snapshot'),(11,1,NULL,'  ','Catalogue fallback'),
 (12,NULL,1,NULL,NULL),(13,2,NULL,NULL,'100% Natural')),
orders(id,user_id,status,created_at) AS (VALUES (20,1,'submitted','2026-09-30'::timestamp)),
order_items(order_id,product_id,price_list_item_id,ean,description) AS (VALUES
 (20,1,NULL::integer,NULL::text,NULL::text))`;

const literal = (value: string) => "'" + value.replaceAll("'", "''") + "'";
const cases = [
 ["Snapshot identity", workspaceQuoteSearchSql, "0088888888888", [10]],
 ["Blank snapshot fallback; historical identity stays separate", workspaceQuoteSearchSql, "0012345678905", [11]],
 ["Price list identity", workspaceQuoteSearchSql, "0077777777777", [12]],
 ["Literal wildcard", workspaceQuoteSearchSql, "100%", [13]],
 ["Order EAN fallback", workspaceOrderSearchSql, "0012345678905", [20]],
 ["Brand matching", workspaceProductSearchSql, "Example Wellness", [1,2]],
 ["Category matching", workspaceProductSearchSql, "Vitamins", [1,2]],
 ["Exact leading-zero EAN", workspaceProductSearchSql, "0012345678905", [1]],
] as const;
console.log(JSON.stringify(cases.map(([name, sql, term, expected]) => ({ name, expected,
 sql: fixtures + ", matches AS (" + sql.replaceAll("$1", literal(workspaceLike(term))).replaceAll("$2", literal(term)) + ") SELECT COALESCE(json_agg(id ORDER BY id),'[]'::json) AS ids FROM matches;",
}))));
