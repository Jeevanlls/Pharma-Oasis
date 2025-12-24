import express, { type Request, Response, NextFunction } from "express";
import { createServer, IncomingMessage, ServerResponse } from "http";
import path from "path";

// Create Express app
const app = express();

// Create HTTP server - we'll set up the request handler after health routes
const httpServer = createServer();

// ============================================================================
// STEP 1: HEALTH CHECK ROUTES - MUST BE FIRST, BEFORE ANY MIDDLEWARE
// These respond immediately with no database or middleware overhead
// ============================================================================
app.get("/health", (_, res) => res.status(200).send("OK"));
app.get("/healthz", (_, res) => res.status(200).send("OK"));

// Raw HTTP health check as fallback - catches requests before Express middleware
httpServer.on("request", (req: IncomingMessage, res: ServerResponse) => {
  const url = req.url || "";
  const accept = req.headers["accept"] || "";
  
  // Dedicated health endpoints - always respond immediately
  if (url === "/health" || url === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
    return;
  }
  
  // Root "/" - health probes don't send Accept: text/html, browsers do
  if (url === "/") {
    const isBrowser = accept.includes("text/html") || accept.includes("application/xhtml+xml");
    if (!isBrowser) {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");
      return;
    }
  }
  
  // All other requests go through Express
  app(req, res);
});

// ============================================================================
// STEP 2: MIDDLEWARE - REGISTERED AFTER HEALTH ROUTES
// ============================================================================
declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Lazy load compression and helmet to avoid blocking startup
let compressionMiddleware: any = null;
let helmetMiddleware: any = null;

// Middleware will be set up after server starts listening
function setupMiddleware() {
  const compression = require("compression");
  const helmet = require("helmet");
  
  compressionMiddleware = compression();
  helmetMiddleware = helmet({
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
  });

  // Register middleware AFTER health routes
  app.use(compressionMiddleware);
  app.use(helmetMiddleware);
  
  app.use(
    express.json({
      limit: '50mb',
      verify: (req: any, _res: any, buf: any) => {
        req.rawBody = buf;
      },
    }),
  );
  
  app.use(express.urlencoded({ extended: false, limit: '50mb' }));

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    const reqPath = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (reqPath.startsWith("/api")) {
        let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        log(logLine);
      }
    });

    next();
  });
}

// ============================================================================
// STEP 3: LOGGING UTILITY
// ============================================================================
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// ============================================================================
// STEP 4: START SERVER IMMEDIATELY - NO BLOCKING CODE BEFORE THIS
// ============================================================================
const port = parseInt(process.env.PORT || "5000", 10);

httpServer.listen(
  {
    port,
    host: "0.0.0.0",
    reusePort: true,
  },
  () => {
    log(`serving on port ${port}`);
    log("Health check endpoints ready: /health, /healthz, /");
    
    // CRITICAL: All initialization happens AFTER server is listening
    // Use setImmediate to ensure health checks can be processed first
    setImmediate(() => {
      // Stage 1: Setup middleware (fast, no DB)
      setupMiddleware();
      log("Middleware configured");
      
      // Stage 2: Initialize app (database, routes, etc.)
      setImmediate(() => {
        initializeApp().catch((err) => {
          log(`Initialization failed: ${err.message}`);
        });
      });
    });
  },
);

// ============================================================================
// STEP 5: ASYNC INITIALIZATION - ALL HEAVY WORK HERE, AFTER SERVER IS HEALTHY
// ============================================================================
async function initializeApp() {
  try {
    // Dynamic imports to avoid blocking startup
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const { setupChatWebSocket } = await import("./chat-websocket");
    const { registerRoutes } = await import("./routes");
    const { serveStatic } = await import("./static");

    // Setup WebSocket for chat
    setupChatWebSocket(httpServer);

    // Register all routes
    await registerRoutes(httpServer, app);

    // Error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });

    // Serve static assets from public folder
    const publicPath = path.resolve(process.cwd(), "public");
    app.use(express.static(publicPath, {
      maxAge: "7d",
      etag: true,
    }));

    // Serve attached assets with long-term caching
    const attachedAssetsPath = path.resolve(process.cwd(), "attached_assets");
    app.use("/attached_assets", express.static(attachedAssetsPath, {
      maxAge: "30d",
      etag: true,
      immutable: true,
    }));

    // Setup Vite in development or static serving in production
    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    log("Routes and static serving ready");

    // Stage 3: Background tasks - further deferred to keep event loop free
    setImmediate(() => {
      runBackgroundTasks(db, users, eq);
    });

  } catch (error: any) {
    log(`Initialization error: ${error.message}`);
  }
}

// ============================================================================
// STEP 6: BACKGROUND TASKS - FULLY DEFERRED, NON-BLOCKING
// ============================================================================
async function runBackgroundTasks(db: any, users: any, eq: any) {
  try {
    // Stage 3a: Chat tables - deferred
    setImmediate(async () => {
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
      } catch (err: any) {
        log(`Chat tables warning: ${err.message}`);
      }
    });

    // Stage 3b: Auto-seed check - deferred with setTimeout for extra delay
    setTimeout(async () => {
      try {
        const adminUser = await db.select().from(users).where(eq(users.email, "admin@pharmaoasis.com"));
        if (adminUser.length === 0) {
          log("Database appears empty, auto-seeding demo data...");
          const { seed } = await import("./seed");
          await seed();
          log("Auto-seed completed successfully!");
        } else {
          log("Database already has data, skipping auto-seed");
        }
      } catch (seedError: any) {
        log(`Auto-seed check skipped: ${seedError.message}`);
      }
    }, 100);

    // Stage 3c: Import processor - deferred with setTimeout
    setTimeout(async () => {
      try {
        const { startImportProcessor } = await import("./import-processor");
        startImportProcessor();
        log("Application fully initialized");
      } catch (err: any) {
        log(`Import processor warning: ${err.message}`);
      }
    }, 200);

  } catch (error: any) {
    log(`Background task warning: ${error.message}`);
  }
}
