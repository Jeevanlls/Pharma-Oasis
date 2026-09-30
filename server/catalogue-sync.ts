import pg from "pg";
import { randomUUID } from "node:crypto";
import { pool } from "./db";
import { prepareCatalogue, catalogueSchemaStatements, stageCatalogueSql, applyCatalogueStatements, type AppCatalogueRow } from "./catalogue-sync-plan";
let running = false;
let source: pg.Pool | null = null;
let schemaReady: Promise<unknown> | null = null;
export function ensureCatalogueSchema() {
    return schemaReady ??= (async () => { for (const sql of catalogueSchemaStatements)
        await pool.query(sql); })().catch(error => { schemaReady = null; throw error; });
}
export async function catalogueSyncStatus() {
    await ensureCatalogueSchema();
    const result = await pool.query("SELECT id,started_at,finished_at,status,summary,error FROM catalogue_sync_runs ORDER BY started_at DESC LIMIT 5");
    return { configured: !!process.env.APP_CATALOGUE_DATABASE_URL, running, runs: result.rows };
}
export async function syncCatalogue() {
    if (running)
        throw new Error("Catalogue sync is already running.");
    if (!process.env.APP_CATALOGUE_DATABASE_URL)
        throw new Error("App catalogue connection is not configured.");
    running = true;
    const runId = randomUUID();
    let client: pg.PoolClient | null = null;
    try {
        await ensureCatalogueSchema();
        client = await pool.connect();
        const lock = await client.query("SELECT pg_try_advisory_lock(73119,20260930) locked");
        if (!lock.rows[0].locked)
            throw new Error("Another catalogue sync is running.");
        source ??= new pg.Pool({ connectionString: process.env.APP_CATALOGUE_DATABASE_URL, max: 1, connectionTimeoutMillis: 15000, idleTimeoutMillis: 10000 });
        const rows = await source.query<AppCatalogueRow>("SELECT id,ean,name,brand,category,pack_size,case_size,status,is_archived FROM products ORDER BY id");
        const existing = await client.query("SELECT id,ean,sku,is_active,inventory_product_id,inventory_reference FROM products");
        const plan = prepareCatalogue(rows.rows, existing.rows);
        const previous = await client.query("SELECT summary FROM catalogue_sync_runs WHERE status='complete' ORDER BY finished_at DESC LIMIT 1");
        if (previous.rows[0]?.summary?.products && plan.products.length < previous.rows[0].summary.products * 0.9)
            throw new Error("Source catalogue fell by more than 10%; review in the app before retrying.");
        await client.query("INSERT INTO catalogue_sync_runs(id,summary) VALUES($1,$2)", [runId, JSON.stringify(plan.summary)]);
        for (let i = 0; i < plan.products.length; i += 1000)
            await client.query(stageCatalogueSql, [runId, JSON.stringify(plan.products.slice(i, i + 1000))]);
        await client.query("BEGIN");
        try {
            await client.query("SET LOCAL statement_timeout='120s'");
            for (const sql of applyCatalogueStatements)
                await client.query(sql, [runId]);
            await client.query("COMMIT");
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        // Staging has no prices or personal data. Retain failed runs for investigation.
        await client.query("DELETE FROM catalogue_sync_rows WHERE run_id IN(SELECT id FROM catalogue_sync_runs WHERE status='complete' AND finished_at<now()-interval '7 days')");
        return { runId, ...plan.summary };
    }
    catch (error) {
        if (client)
            await client.query("UPDATE catalogue_sync_runs SET status='failed',finished_at=now(),error=$2 WHERE id=$1", [runId, (error as Error).message.slice(0, 500)]).catch(() => { });
        throw error;
    }
    finally {
        if (client) {
            await client.query("SELECT pg_advisory_unlock(73119,20260930)").catch(() => { });
            client.release();
        }
        running = false;
    }
}
let started = false;
export function startCatalogueSync() {
    if (started || process.env.CATALOGUE_SYNC_ENABLED !== "true")
        return;
    started = true;
    const tick = () => syncCatalogue().then(r => console.log("Catalogue sync complete:", JSON.stringify(r))).catch(e => console.error("Catalogue sync failed:", e.message));
    setTimeout(() => void tick(), 60000).unref();
    setInterval(() => void tick(), 6 * 60 * 60 * 1000).unref();
}
