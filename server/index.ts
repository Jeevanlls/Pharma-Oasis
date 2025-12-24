import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import path from "path";
import compression from "compression";
import helmet from "helmet";

// Create Express app
const app = express();

// ============================================================================
// STEP 1: HEALTH CHECK ROUTES - MUST BE FIRST, BEFORE ANY MIDDLEWARE
// These respond immediately with no database or middleware overhead
// ============================================================================
app.get("/", (_, res) => res.status(200).send("OK"));
app.get("/health", (_, res) => res.status(200).send("OK"));
app.get("/healthz", (_, res) => res.status(200).send("OK"));

// ============================================================================
// STEP 2: MIDDLEWARE - REGISTERED SYNCHRONOUSLY BEFORE listen()
// ============================================================================
declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Compression middleware
app.use(compression());

// Security headers
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

// Body parsers
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
// STEP 4: CREATE HTTP SERVER AND START LISTENING
// Express is fully configured with health routes + middleware before listen()
// ============================================================================
const httpServer = createServer(app);
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
    
    // CRITICAL: Only HEAVY ASYNC work is deferred after listen()
    // Middleware is already registered synchronously above
    setImmediate(() => {
      initializeApp().catch((err) => {
        log(`Initialization failed: ${err.message}`);
      });
    });
  },
);

// ============================================================================
// STEP 5: ASYNC INITIALIZATION - DATABASE, ROUTES, WEBSOCKET
// Only heavy work that requires async/await is deferred here
// ============================================================================
async function initializeApp() {
  try {
    // Dynamic imports for heavy modules
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const { setupChatWebSocket } = await import("./chat-websocket");
    const { registerRoutes } = await import("./routes");
    const { serveStatic } = await import("./static");

    // Setup WebSocket for chat
    setupChatWebSocket(httpServer);

    // Register all API routes
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

    // Stage 2: Background tasks - further deferred
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
    // Chat tables creation
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

    // Auto-seed check
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

    // Import processor
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
