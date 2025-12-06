import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Use external Neon database if available, otherwise fall back to Replit's DATABASE_URL
let connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

// Clean up connection string if it contains psql command prefix
if (connectionString && connectionString.startsWith("psql ")) {
  connectionString = connectionString.replace(/^psql\s+'?/, "").replace(/'$/, "");
}

if (!connectionString) {
  throw new Error(
    "NEON_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
