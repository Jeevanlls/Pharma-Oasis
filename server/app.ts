import express, { type Request, Response, NextFunction } from "express"; 
import { createServer } from "http"; 
import path from "path"; 
import compression from "compression"; 
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

// ============================================================================
// FULL APPLICATION ENTRY POINT (server/app.ts)
// This is the main application with full initialization
// For promotion-only health checks, use server/promotion.ts instead
// ============================================================================
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Gate state
let backgroundTasksEnabled = false;
let backgroundTasksInitialized = false;

// Create Express app
const app = express();

// ============================================================================
// STEP 1: HEALTH CHECK ROUTES - MUST BE FIRST, BEFORE ANY MIDDLEWARE
// These respond immediately with no database or middleware overhead
// ============================================================================
// /health and /healthz are dedicated health endpoints
app.get("/health", (_, res) => res.status(200).send("OK"));
app.get("/healthz", (_, res) => res.status(200).send("OK"));

// "/" only returns "OK" for health probes (not browsers wanting the app)
// Health probes typically don't send Accept: text/html or have no User-Agent
app.get("/", (req, res, next) => {
  const acceptHeader = req.headers.accept || "";
  const userAgent = req.headers["user-agent"] || "";
  
  // If it's a health probe (no browser indicators), return OK
  const isBrowser = acceptHeader.includes("text/html") || 
                    userAgent.includes("Mozilla") ||
                    userAgent.includes("Chrome") ||
                    userAgent.includes("Safari");
  
  if (!isBrowser) {
    return res.status(200).send("OK");
  }
  
  // For browsers, pass through to static file serving
  next();
});

// Gate status endpoint - shows application state
app.get("/api/gate-status", (_, res) => {
  res.json({
    backgroundTasksEnabled,
    backgroundTasksInitialized,
    isProduction: IS_PRODUCTION,
    entryPoint: "app.ts",
  });
});

// ============================================================================
// STEP 2: MIDDLEWARE - REGISTERED SYNCHRONOUSLY BEFORE listen()
// NO database imports happen here - pure Express middleware only
// ============================================================================
declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// CORS - restrict to known origins
const allowedOrigins = [
  "https://pharmaoasis.co.uk",
  "https://www.pharmaoasis.co.uk",
  "https://pharmaoasis.com",
  "https://www.pharmaoasis.com",
];

// Single source of truth for whether an Origin may access the app.
function isOriginAllowed(origin?: string): boolean {
  if (!origin) return true; // same-origin, health probes, server-to-server
  if (allowedOrigins.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    // Localhost in development
    if (!IS_PRODUCTION && (host === "localhost" || host === "127.0.0.1")) return true;
    // Render preview/deploy domains (temporary test URL)
    if (/\.onrender\.com$/.test(host)) return true;
  } catch {
    // malformed Origin — fall through to reject
  }
  return false;
}

app.use(cors({
  origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
  credentials: true,
}));

// Explicitly return 403 for requests whose origin was rejected by CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || isOriginAllowed(origin)) return next();
  return res.status(403).json({ message: "Origin not allowed" });
});

// Global API rate limiter — 100 requests per minute per IP across all /api/ routes
const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down and try again in a minute." },
  skip: (req) => req.path === "/api/health" || req.path === "/health" || req.path === "/healthz",
});
app.use("/api", globalApiLimiter);

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

// Allow search engine indexing for all public (non-admin, non-API) routes
app.use((req, res, next) => {
  if (!req.path.startsWith("/api") && !req.path.startsWith("/admin")) {
    res.setHeader("X-Robots-Tag", "index, follow");
  }
  next();
});

// Request logging middleware (lightweight, no DB)
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
// Express has ONLY health routes and middleware - NO database imports
// Event loop is COMPLETELY FREE for health checks
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
    
    // ========================================================================
    // FULL APPLICATION INITIALIZATION
    // This entry point always initializes - use promotion.ts for health-only
    // ========================================================================
    log("Starting full application initialization...");
    activateBackgroundTasks();
  },
);

// ============================================================================
// STEP 5: ACTIVATION ENDPOINT - Triggers background task initialization
// Call this AFTER deployment promotion completes
// DISABLE_BACKGROUND_TASKS only prevents AUTO-start, not manual activation
// ============================================================================
app.post("/api/admin/activate-background-tasks", async (req, res) => {
  if (backgroundTasksEnabled) {
    return res.json({ success: true, message: "Background tasks already enabled" });
  }
  
  try {
    await activateBackgroundTasks();
    res.json({ success: true, message: "Background tasks activated successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// STEP 6: ACTIVATION FUNCTION - Initializes full application
// ============================================================================
async function activateBackgroundTasks() {
  if (backgroundTasksEnabled) {
    log("Background tasks already enabled, skipping");
    return;
  }
  
  backgroundTasksEnabled = true;
  log("Activating background tasks...");
  
  try {
    await initializeFullApplication();
    backgroundTasksInitialized = true;
    log("Background tasks fully initialized");
  } catch (error: any) {
    log(`Background task activation failed: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// STEP 7: FULL APPLICATION INITIALIZATION
// ALL database operations are contained here
// ============================================================================
async function initializeFullApplication() {
  try {
    // NOW we can import modules that touch the database
    const { setupChatWebSocket } = await import("./chat-websocket");
    const { registerRoutes } = await import("./routes");
    const { serveStatic } = await import("./static");
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    log("Database connection established");

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
    if (IS_PRODUCTION) {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    log("Routes and static serving ready");

    // Chat tables creation
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

    // Add password reset columns to users table if not present
    try {
      await db.execute(`
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(128),
          ADD COLUMN IF NOT EXISTS password_reset_expiry TIMESTAMP;
      `);
    } catch (err: any) {
      log(`Password reset columns warning: ${err.message}`);
    }

    // Auto-seed only when the DB is genuinely fresh (no users at all) — never re-seed a live DB.
    try {
      const anyUser = await db.select({ id: users.id }).from(users).limit(1);
      if (anyUser.length === 0) {
        log("Database appears empty (no users), auto-seeding demo data...");
        const { seed } = await import("./seed");
        await seed();
        log("Auto-seed completed successfully!");
      } else {
        log("Database already has data, skipping auto-seed");
      }
    } catch (seedError: any) {
      log(`Auto-seed check skipped: ${seedError.message}`);
    }

    // Import processor
    try {
      const { startImportProcessor } = await import("./import-processor");
      startImportProcessor();
    } catch (err: any) {
      log(`Import processor warning: ${err.message}`);
    }

    // Daily sweep that gives new inventory customers a portal login.
    // Dormant until switched on in Admin -> Customer Logins.
    try {
      const { startAutoInviteScheduler } = await import("./customer-auto-invite");
      startAutoInviteScheduler();
    } catch (err: any) {
      log(`Auto-invite scheduler warning: ${err.message}`);
    }

    log("Application fully initialized");

  } catch (error: any) {
    log(`Initialization error: ${error.message}`);
    throw error;
  }
}
