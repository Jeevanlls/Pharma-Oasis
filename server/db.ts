import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Use external Neon database if available, otherwise fall back to Replit's DATABASE_URL
const usingNeon = !!process.env.NEON_DATABASE_URL;
let connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
console.log(`Database: Using ${usingNeon ? 'NEON_DATABASE_URL (shared)' : 'DATABASE_URL (Replit)'}`);


// Clean up connection string if it contains psql command prefix
if (connectionString && connectionString.startsWith("psql ")) {
  connectionString = connectionString.replace(/^psql\s+'?/, "").replace(/'$/, "");
}

if (!connectionString) {
  throw new Error(
    "NEON_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
export const db = drizzle(pool, { schema });

pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm')
  .then(() => pool.query("CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (COALESCE(product_name, '') gin_trgm_ops)"))
  .then(() => console.log('pg_trgm extension and index ready'))
  .catch((err: Error) => {
    console.warn('pg_trgm setup note (search will use ILIKE fallback):', err.message);
  });
