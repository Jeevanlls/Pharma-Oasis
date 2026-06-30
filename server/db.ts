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
    offer_price DECIMAL(10,2),
    original_price DECIMAL(10,2),
    discount_label VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  ALTER TABLE offer_items ALTER COLUMN offer_price DROP NOT NULL;
`).then(() => console.log('Offers tables ready'))
  .catch((err: Error) => console.warn('Offers tables setup:', err.message));

// ============================================================
// Customer Pricing & Portal tables (cost uploads, price lists, orders)
// ============================================================
pool.query(`
  CREATE TABLE IF NOT EXISTS cost_uploads (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER NOT NULL,
    supplier_name VARCHAR(255),
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    comment TEXT,
    file_name VARCHAR(255),
    uploaded_by INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    row_count INTEGER DEFAULT 0,
    matched_count INTEGER DEFAULT 0,
    unmatched_count INTEGER DEFAULT 0,
    published_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS cost_upload_rows (
    id SERIAL PRIMARY KEY,
    upload_id INTEGER NOT NULL,
    product_id INTEGER,
    ean VARCHAR(50),
    description VARCHAR(500),
    category_name VARCHAR(255),
    case_size VARCHAR(100),
    cost_price DECIMAL(10,2),
    supplier_qty INTEGER,
    supplier_name VARCHAR(255),
    valid_until TIMESTAMP,
    comment TEXT,
    match_status VARCHAR(20) DEFAULT 'unmatched',
    previous_cost DECIMAL(10,2),
    change_percent DECIMAL(7,2),
    flagged BOOLEAN DEFAULT false,
    flag_reason VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_cost_upload_rows_upload ON cost_upload_rows (upload_id);
  CREATE INDEX IF NOT EXISTS idx_cost_upload_rows_product ON cost_upload_rows (product_id);

  CREATE TABLE IF NOT EXISTS price_lists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'tier',
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS price_list_rules (
    id SERIAL PRIMARY KEY,
    price_list_id INTEGER NOT NULL,
    level VARCHAR(20) NOT NULL,
    target_id INTEGER,
    margin_percent DECIMAL(6,2),
    fixed_price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_price_list_rules_list ON price_list_rules (price_list_id);

  CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted',
    price_list_id INTEGER,
    total_amount DECIMAL(12,2),
    customer_notes TEXT,
    admin_notes TEXT,
    admin_response TEXT,
    responded_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    unit_price DECIMAL(10,2),
    margin_applied DECIMAL(6,2),
    line_total DECIMAL(12,2),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);

  -- New columns on existing tables
  ALTER TABLE products ADD COLUMN IF NOT EXISTS active_cost_price DECIMAL(10,2);
  ALTER TABLE products ADD COLUMN IF NOT EXISTS active_cost_upload_id INTEGER;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_effective_date TIMESTAMP;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_expiry_date TIMESTAMP;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_status VARCHAR(20) DEFAULT 'none';
  ALTER TABLE products ADD COLUMN IF NOT EXISTS available_qty INTEGER;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS price_list_id INTEGER;
  -- Two-factor auth (TOTP) columns
  ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(64);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT;
  ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2);
  ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS margin_applied DECIMAL(6,2);
  -- Price list publish/archive tracking (v2)
  ALTER TABLE price_lists ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;
  ALTER TABLE price_lists ADD COLUMN IF NOT EXISTS rounding_mode VARCHAR(20) NOT NULL DEFAULT 'none';
  ALTER TABLE price_list_items ADD COLUMN IF NOT EXISTS rounding_mode VARCHAR(20) NOT NULL DEFAULT 'none';
  ALTER TABLE price_lists ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
  -- Backfill publish date for lists already live (idempotent: only fills nulls)
  UPDATE price_lists SET published_at = updated_at WHERE status = 'published' AND published_at IS NULL;
  -- Category lists + Monthly Promotions (Phase 1): scope tag + category target + promo window.
  -- scope: 'brand' (default, every existing list) | 'category' | 'promotion'.
  ALTER TABLE price_lists ADD COLUMN IF NOT EXISTS scope VARCHAR(20) NOT NULL DEFAULT 'brand';
  ALTER TABLE price_lists ADD COLUMN IF NOT EXISTS category_id INTEGER; -- when scope='category'
  ALTER TABLE price_lists ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP; -- when scope='promotion' (live window)
  ALTER TABLE price_lists ADD COLUMN IF NOT EXISTS ends_at   TIMESTAMP; -- when scope='promotion' (auto-expire)
  -- Generalize per-customer uniqueness from "one list per brand" to "one list per scope target".
  -- Promotions are GLOBAL and are NOT written here. Category rows carry no brand_id.
  ALTER TABLE customer_price_lists ADD COLUMN IF NOT EXISTS scope    VARCHAR(20) NOT NULL DEFAULT 'brand';
  ALTER TABLE customer_price_lists ADD COLUMN IF NOT EXISTS scope_id INTEGER;
  UPDATE customer_price_lists SET scope_id = brand_id WHERE scope_id IS NULL;
  ALTER TABLE customer_price_lists ALTER COLUMN brand_id DROP NOT NULL;
  -- Create the NEW unique index before dropping the OLD constraint (guarantee never absent).
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_customer_scope ON customer_price_lists (customer_id, scope, scope_id);
  ALTER TABLE customer_price_lists DROP CONSTRAINT IF EXISTS uniq_customer_brand;
  -- Orders: quote link + inventory-handoff/archive tracking (Sales pipeline Phase A)
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_id INTEGER;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS entered_to_inventory_at TIMESTAMP;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS entered_by INTEGER;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
`).then(() => console.log('Customer pricing & portal tables ready'))
  .catch((err: Error) => console.warn('Customer pricing tables setup:', err.message));

// ============================================================
// Trusted devices for 2FA ("remember this device for 30 days")
// ============================================================
pool.query(`
  CREATE TABLE IF NOT EXISTS trusted_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    label VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_trusted_devices_token ON trusted_devices(token_hash);
  CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id);
`).then(() => console.log('Trusted devices table ready'))
  .catch((err: Error) => console.warn('Trusted devices setup:', err.message));

// ============================================================
// E5 — Deal events (quote/order activity timeline + comms log)
// ============================================================
pool.query(`
  CREATE TABLE IF NOT EXISTS deal_events (
    id SERIAL PRIMARY KEY,
    deal_kind VARCHAR(10) NOT NULL,
    deal_id INTEGER NOT NULL,
    type VARCHAR(40) NOT NULL,
    actor_id INTEGER,
    message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_deal_events_deal ON deal_events (deal_kind, deal_id);
`).then(() => console.log('Deal events table ready'))
  .catch((err: Error) => console.warn('Deal events setup:', err.message));
