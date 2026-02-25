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

pool.query(`
  CREATE TABLE IF NOT EXISTS offers (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    hero_image_url TEXT,
    hero_title VARCHAR(255),
    hero_subtitle TEXT,
    display_style VARCHAR(50) DEFAULT 'grid',
    badge_text VARCHAR(50) DEFAULT 'OFFER',
    badge_color VARCHAR(20) DEFAULT 'red',
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    meta_title VARCHAR(255),
    meta_description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS offer_items (
    id SERIAL PRIMARY KEY,
    offer_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    offer_price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    discount_label VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`).then(() => console.log('Offers tables ready'))
  .catch((err: Error) => console.warn('Offers tables setup:', err.message));
