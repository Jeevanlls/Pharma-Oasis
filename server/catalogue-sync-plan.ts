export type AppCatalogueRow = {
    id: number;
    ean: string;
    name: string;
    brand: string | null;
    category: string | null;
    pack_size: string | null;
    case_size: number | null;
    status: string | null;
    is_archived: boolean;
};
export type WebCatalogueIdentity = {
    id: number;
    ean: string | null;
    sku: string;
    is_active: boolean;
    inventory_product_id?: number | null;
    inventory_reference?: string | null;
};
export const canonicalReference = (value: string | null | undefined) => (value ?? "").replace(/\s/g, "");
const clean = (value: string | null | undefined) => value?.trim().replace(/\s+/g, " ") || null;
/** Only source identity and publication metadata. Never import stock or prices. */
export function prepareCatalogue(source: AppCatalogueRow[], existing: WebCatalogueIdentity[]) {
    const groups = new Map<string, AppCatalogueRow[]>();
    for (const row of source) {
        if (row.is_archived)
            continue;
        const key = canonicalReference(row.ean);
        if (!key || !Number.isSafeInteger(Number(row.id)) || !clean(row.name))
            throw new Error("Invalid app product identity; sync stopped.");
        const group = groups.get(key) ?? [];
        group.push(row);
        groups.set(key, group);
    }
    if (!groups.size)
        throw new Error("Empty source catalogue; sync stopped.");
    const byRef = new Map<string, WebCatalogueIdentity[]>();
    const byAppId = new Map<number, WebCatalogueIdentity>();
    for (const row of existing) {
        const key = row.inventory_reference || canonicalReference(row.ean || row.sku);
        const group = byRef.get(key) ?? [];
        group.push(row);
        byRef.set(key, group);
        if (row.inventory_product_id)
            byAppId.set(Number(row.inventory_product_id), row);
    }
    const used = new Set<number>();
    const products = Array.from(groups.entries()).map(([reference, group]) => {
        // Prefer the unmodified, exact EAN. Retain every source ID in the audit link;
        // no employee-app row or historical transaction is merged/deleted.
        group.sort((a, b) => Number(b.ean === reference) - Number(a.ean === reference) || Number(a.id) - Number(b.id));
        const row = group[0];
        const matches = byRef.get(reference) ?? [];
        matches.sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.id - b.id);
        const match = matches[0] ?? byAppId.get(Number(row.id));
        if (match && used.has(match.id))
            throw new Error("Two source references claim one website product; sync stopped.");
        if (match)
            used.add(match.id);
        const issues: string[] = [];
        if (group.length > 1)
            issues.push("Duplicate app references: " + group.map(p => p.id).join(", "));
        if (new Set(group.map(p => clean(p.brand)?.toLowerCase())).size > 1 || new Set(group.map(p => clean(p.category)?.toLowerCase())).size > 1)
            issues.push("Duplicate app records have different taxonomy; exact unspaced EAN takes precedence.");
        if (!clean(row.brand))
            issues.push("Brand missing in app; retained for trading history.");
        if (!clean(row.category))
            issues.push("Category missing in app; retained for trading history.");
        if (!clean(row.status))
            issues.push("Classification missing in app; confirm before supply.");
        if (!/^(?:\d{8}|\d{12,14})$/.test(reference))
            issues.push("Product reference, not a verified EAN length.");
        return { reference, app_id: Number(row.id), app_ids: group.map(p => Number(p.id)), existing_id: match?.id ?? null,
            name: clean(row.name)!, brand: clean(row.brand) || "Brand to be confirmed", category: clean(row.category) || "Category to be confirmed",
            pack_size: clean(row.pack_size), case_size: row.case_size == null ? null : String(row.case_size), classification: clean(row.status), issues };
    });
    return { products, summary: { sourceRecords: source.length, activeAppRecords: source.filter(p => !p.is_archived).length,
            products: products.length, duplicateRecords: source.filter(p => !p.is_archived).length - products.length,
            newProducts: products.filter(p => !p.existing_id).length, matchedProducts: products.filter(p => p.existing_id).length,
            flaggedProducts: products.filter(p => p.issues.length).length } };
}
export const catalogueSchemaStatements = [
    `CREATE TABLE IF NOT EXISTS catalogue_sync_runs (id uuid PRIMARY KEY, started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, status text NOT NULL DEFAULT 'staging', summary jsonb, error text)`,
    `CREATE TABLE IF NOT EXISTS catalogue_sync_rows (run_id uuid NOT NULL REFERENCES catalogue_sync_runs(id), reference text NOT NULL, app_id integer NOT NULL, app_ids jsonb NOT NULL, existing_id integer, name text NOT NULL, brand text NOT NULL, category text NOT NULL, pack_size text, case_size text, classification text, issues jsonb NOT NULL, PRIMARY KEY(run_id,reference))`,
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory_product_id integer, ADD COLUMN IF NOT EXISTS inventory_reference text, ADD COLUMN IF NOT EXISTS inventory_product_ids jsonb, ADD COLUMN IF NOT EXISTS inventory_data_issues jsonb, ADD COLUMN IF NOT EXISTS catalogue_sort_rank integer`,
    `ALTER TABLE products ALTER COLUMN ean TYPE text, ALTER COLUMN pack_size TYPE text`,
    `CREATE UNIQUE INDEX IF NOT EXISTS products_inventory_reference_unique ON products(inventory_reference) WHERE inventory_reference IS NOT NULL`,
    `CREATE UNIQUE INDEX IF NOT EXISTS products_inventory_id_unique ON products(inventory_product_id) WHERE inventory_product_id IS NOT NULL`,
    `CREATE UNIQUE INDEX IF NOT EXISTS products_live_ean_unique ON products((regexp_replace(ean,'\\s','','g'))) WHERE is_active AND nullif(ean,'') IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS products_catalogue_order ON products(is_active,catalogue_sort_rank,id)`,
    `CREATE INDEX IF NOT EXISTS products_ean_lookup ON products(ean)`,
    `CREATE INDEX IF NOT EXISTS brands_catalogue_name ON brands((lower(btrim(name))))`,
    `CREATE INDEX IF NOT EXISTS categories_catalogue_name ON categories((lower(btrim(name)))) WHERE parent_id IS NULL`,
];
export const stageCatalogueSql = `INSERT INTO catalogue_sync_rows
  SELECT $1::uuid,x.* FROM jsonb_to_recordset($2::jsonb) AS x(reference text,app_id integer,app_ids jsonb,existing_id integer,name text,brand text,category text,pack_size text,case_size text,classification text,issues jsonb)`;
const brandId = `(SELECT b.id FROM brands b WHERE lower(btrim(b.name))=lower(s.brand) ORDER BY b.is_active DESC NULLS LAST,b.id LIMIT 1)`;
const categoryId = `(SELECT c.id FROM categories c WHERE lower(btrim(c.name))=lower(s.category) AND c.parent_id IS NULL ORDER BY c.is_active DESC NULLS LAST,c.id LIMIT 1)`;
/** Apply as one transaction after a complete source read and staged count check. */
export const applyCatalogueStatements = [
    `SELECT pg_advisory_xact_lock(73119,20260930) WHERE $1::uuid IS NOT NULL`,
    `INSERT INTO brands(name,slug,is_active) SELECT DISTINCT ON(lower(s.brand)) s.brand,'app-'||md5(lower(s.brand)),true FROM catalogue_sync_rows s WHERE run_id=$1 AND NOT EXISTS(SELECT 1 FROM brands b WHERE lower(btrim(b.name))=lower(s.brand)) ORDER BY lower(s.brand),s.app_id ON CONFLICT(name) DO NOTHING`,
    `INSERT INTO categories(name,slug,is_active) SELECT DISTINCT ON(lower(s.category)) s.category,'app-'||md5(lower(s.category)),true FROM catalogue_sync_rows s WHERE run_id=$1 AND NOT EXISTS(SELECT 1 FROM categories c WHERE lower(btrim(c.name))=lower(s.category) AND parent_id IS NULL) ORDER BY lower(s.category),s.app_id`,
    `UPDATE products p SET ean=s.reference,product_name=s.name,brand_id=${brandId},category_id=${categoryId},subcategory_id=NULL,
    pack_size=s.pack_size,case_size=s.case_size,product_type=s.classification,is_active=true,
    inventory_product_id=s.app_id,inventory_reference=s.reference,inventory_product_ids=s.app_ids,inventory_data_issues=s.issues,updated_at=now()
    FROM catalogue_sync_rows s WHERE s.run_id=$1 AND p.id=s.existing_id AND
    (p.ean,p.product_name,p.brand_id,p.category_id,p.subcategory_id,p.pack_size,p.case_size,p.product_type,p.is_active,p.inventory_product_id,p.inventory_reference,p.inventory_product_ids,p.inventory_data_issues)
    IS DISTINCT FROM (s.reference,s.name,${brandId},${categoryId},NULL::integer,s.pack_size,s.case_size,s.classification,true,s.app_id,s.reference,s.app_ids,s.issues)`,
    `INSERT INTO products(sku,slug,ean,product_name,brand_id,category_id,pack_size,case_size,product_type,is_active,inventory_product_id,inventory_reference,inventory_product_ids,inventory_data_issues,google_feed_enabled)
    SELECT 'APP-'||s.app_id,left(trim(both '-' from regexp_replace(lower(s.name),'[^a-z0-9]+','-','g')),100)||'-app-'||s.app_id,s.reference,s.name,${brandId},${categoryId},s.pack_size,s.case_size,s.classification,true,s.app_id,s.reference,s.app_ids,s.issues,false
    FROM catalogue_sync_rows s WHERE s.run_id=$1 AND s.existing_id IS NULL`,
    `UPDATE products p SET is_active=false,updated_at=now() WHERE p.inventory_reference IS NOT NULL AND p.is_active
    AND NOT EXISTS(SELECT 1 FROM catalogue_sync_rows s WHERE s.run_id=$1 AND s.reference=p.inventory_reference)
    AND NOT EXISTS(SELECT 1 FROM quote_items q WHERE q.product_id=p.id OR q.ean=p.ean)
    AND NOT EXISTS(SELECT 1 FROM order_items o WHERE o.product_id=p.id OR o.ean=p.ean)`,
    `UPDATE brands b SET is_active=true WHERE NOT b.is_active AND EXISTS(SELECT 1 FROM products p WHERE p.brand_id=b.id AND p.is_active) AND $1::uuid IS NOT NULL`,
    `UPDATE categories c SET is_active=true WHERE NOT c.is_active AND EXISTS(SELECT 1 FROM products p WHERE p.category_id=c.id AND p.is_active) AND $1::uuid IS NOT NULL`,
    `WITH numbered AS (SELECT p.id,p.brand_id,p.image_url,b.name,
      row_number() OVER(PARTITION BY p.brand_id, (nullif(p.image_url,'') IS NOT NULL) ORDER BY p.product_name,p.id) brand_round,
      count(*) FILTER(WHERE nullif(p.image_url,'') IS NOT NULL) OVER(PARTITION BY p.brand_id) photos,
      CASE regexp_replace(lower(b.name),'[^a-z0-9]','','g') WHEN 'myprotein' THEN 0 WHEN 'aveeno' THEN 1 WHEN 'naturesaid' THEN 2 WHEN 'biogaia' THEN 3 WHEN 'hawkinsbrimble' THEN 4 WHEN 'myvitamins' THEN 5 ELSE 10 END priority
      FROM products p JOIN brands b ON b.id=p.brand_id WHERE p.is_active),
    ranked AS(SELECT id,row_number() OVER(ORDER BY (nullif(image_url,'') IS NOT NULL) DESC,brand_round,priority,photos DESC,lower(name),id)::integer rank FROM numbered)
    UPDATE products p SET catalogue_sort_rank=r.rank FROM ranked r WHERE p.id=r.id AND p.catalogue_sort_rank IS DISTINCT FROM r.rank AND $1::uuid IS NOT NULL`,
    `UPDATE catalogue_sync_runs SET status='complete',finished_at=now() WHERE id=$1`,
];
