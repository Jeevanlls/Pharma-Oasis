import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import path from "path";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { setupChatWebSocket } from "./chat-websocket";
import compression from "compression";
import helmet from "helmet";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Fast health check endpoints - MUST be before all middleware for quick response
// Deployment health checks go to / by default
app.get("/health", (_, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Root health check for deployment platform (responds to / without Accept: text/html)
app.get("/", (req, res, next) => {
  const acceptHeader = req.headers.accept || "";
  // If it's a health check (no HTML expected), respond immediately
  if (!acceptHeader.includes("text/html")) {
    return res.status(200).send("OK");
  }
  // Otherwise, continue to serve the React SPA
  next();
});

// Enable gzip/brotli compression for all responses
app.use(compression());

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", "wss:", "ws:"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: "deny" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
  noSniff: true,
}));

app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Ensure chat tables exist (creates them if missing)
async function ensureChatTables() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(100) UNIQUE NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        visitor_name VARCHAR(100),
        visitor_email VARCHAR(255),
        visitor_phone VARCHAR(50),
        visitor_company VARCHAR(200),
        lead_captured BOOLEAN DEFAULT false,
        message_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS chat_leads (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(100),
        name VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(50),
        company VARCHAR(200),
        interest TEXT,
        status VARCHAR(20) DEFAULT 'new',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    log("Chat tables verified/created");
  } catch (error: any) {
    log(`Warning: Could not verify chat tables: ${error.message}`);
  }
}

// Auto-seed database if empty (for production first-time setup)
// This includes retry logic to wait for tables to exist after migrations
async function autoSeedIfEmpty(retries = 10, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // First check if the users table exists
      const tableCheck = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      
      const tableExists = tableCheck.rows[0]?.exists === true;
      
      if (!tableExists) {
        if (attempt < retries) {
          log(`Attempt ${attempt}/${retries}: Database tables not ready, waiting ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        } else {
          log("Database tables not found after all retries. Please run migrations.");
          return;
        }
      }
      
      // Tables exist, check for admin user
      const adminUser = await db.select().from(users).where(eq(users.email, "admin@pharmaoasis.com"));
      if (adminUser.length === 0) {
        log("Database appears empty, auto-seeding demo data...");
        const { seed } = await import("./seed");
        await seed();
        log("Auto-seed completed successfully!");
      } else {
        log("Database already has data, skipping auto-seed");
      }
      return; // Success, exit the retry loop
      
    } catch (error: any) {
      if (attempt < retries) {
        log(`Attempt ${attempt}/${retries}: Database not ready (${error.message}), waiting ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        log(`Auto-seed failed after ${retries} attempts: ${error.message}`);
      }
    }
  }
}

(async () => {
  // Ensure chat tables exist
  await ensureChatTables();
  
  // Auto-seed on startup if database is empty
  await autoSeedIfEmpty();
  
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Serve static assets from public folder with caching (for banner images, etc.)
  const publicPath = path.resolve(process.cwd(), "public");
  app.use(express.static(publicPath, {
    maxAge: "7d",
    etag: true,
  }));

  // Serve attached assets with long-term caching (product images, stock images, etc.)
  const attachedAssetsPath = path.resolve(process.cwd(), "attached_assets");
  app.use("/attached_assets", express.static(attachedAssetsPath, {
    maxAge: "30d",
    etag: true,
    immutable: true,
  }));

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  
  setupChatWebSocket(httpServer);
  
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
