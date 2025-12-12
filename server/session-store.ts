import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

const PgSession = connectPgSimple(session);

export const sessionStore = new PgSession({
  pool: pool,
  tableName: "session",
  createTableIfMissing: true,
});

export const sessionMiddleware = session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || "pharma-oasis-dev-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});
