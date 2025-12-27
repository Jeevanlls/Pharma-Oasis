import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import path from "path";
import compression from "compression";
import helmet from "helmet";

// ============================================================================
// REPLIT PROMOTION MODE DETECTION
// During Replit's promotion phase, ONLY health checks are allowed
// ANY initialization work (even deferred) will cause promotion to fail
// 
// Replit sets REPLIT_DEPLOYMENT="1" in deployed containers
// We detect promotion by checking for deployment AND a specific env var
// that indicates we should stay in health-check-only mode
// ============================================================================
const REPLIT_DEPLOYMENT = process.env.REPLIT_DEPLOYMENT;
const REPLIT_DEPLOYMENT_ID = process.env.REPLIT_DEPLOYMENT_ID;
// Use explicit PROMOTION_MODE env var for reliable detection
const PROMOTION_MODE_ENABLED = process.env.PROMOTION_MODE === "true";
const IS_PROMOTION_MODE = PROMOTION_MODE_ENABLED;

// ============================================================================
// DEPLOYMENT GATE: Explicit control over when background tasks start
// Background tasks are DISABLED until explicitly enabled via:
// 1. Admin endpoint: POST /api/admin/activate-background-tasks
// 2. Auto-activation after delay (if AUTO_ACTIVATE_DELAY is set)
// 3. Immediate activation in development mode
// ============================================================================
const AUTO_ACTIVATE_DELAY_MS = parseInt(process.env.AUTO_ACTIVATE_DELAY || "0", 10);
const DISABLE_BACKGROUND_TASKS = process.env.DISABLE_BACKGROUND_TASKS === "true";
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
app.get("/", (_, res) => res.status(200).send("OK"));
app.get("/health", (_, res) => res.status(200).send("OK"));
app.get("/healthz", (_, res) => res.status(200).send("OK"));

// Gate status endpoint - shows whether background tasks are enabled
app.get("/api/gate-status", (_, res) => {
  res.json({
    backgroundTasksEnabled,
    backgroundTasksInitialized,
    isPromotionMode: IS_PROMOTION_MODE,
    promotionModeEnv: PROMOTION_MODE_ENABLED,
    disabledByEnv: DISABLE_BACKGROUND_TASKS,
    isProduction: IS_PRODUCTION,
    autoActivateDelay: AUTO_ACTIVATE_DELAY_MS,
    replitDeployment: REPLIT_DEPLOYMENT || null,
    replitDeploymentId: REPLIT_DEPLOYMENT_ID || null,
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
    // REPLIT PROMOTION MODE - ZERO INITIALIZATION
    // During promotion, Replit requires the process to ONLY serve health checks
    // ANY additional work (even deferred) will cause promotion to fail
    // ========================================================================
    if (IS_PROMOTION_MODE) {
      log("PROMOTION MODE DETECTED - Health checks only, no initialization");
      log(`REPLIT_DEPLOYMENT=${REPLIT_DEPLOYMENT}, REPLIT_DEPLOYMENT_ID=${REPLIT_DEPLOYMENT_ID}`);
      log("App will fully initialize after restart post-promotion");
      // DO NOT schedule any work - return immediately
      return;
    }
    
    // ========================================================================
    // DEPLOYMENT GATE CONTROL (post-promotion)
    // ========================================================================
    if (DISABLE_BACKGROUND_TASKS) {
      log("DISABLE_BACKGROUND_TASKS=true - Auto-start disabled, waiting for manual activation");
      log("POST /api/admin/activate-background-tasks to enable after promotion");
      return;
    }
    
    // In development, start immediately
    if (!IS_PRODUCTION) {
      log("Development mode - starting full initialization immediately");
      activateBackgroundTasks();
      return;
    }
    
    // In production with auto-activate delay
    if (AUTO_ACTIVATE_DELAY_MS > 0) {
      log(`Production mode - auto-activation in ${AUTO_ACTIVATE_DELAY_MS / 1000} seconds`);
      log("Or POST /api/admin/activate-background-tasks to enable immediately");
      setTimeout(() => {
        if (!backgroundTasksEnabled) {
          log("Auto-activation timer expired - starting background tasks");
          activateBackgroundTasks();
        }
      }, AUTO_ACTIVATE_DELAY_MS);
      return;
    }
    
    // Production without auto-activate - wait for manual trigger
    log("Production mode - waiting for manual activation");
    log("POST /api/admin/activate-background-tasks to enable background tasks");
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

    // Auto-seed check
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

    // Import processor
    try {
      const { startImportProcessor } = await import("./import-processor");
      startImportProcessor();
    } catch (err: any) {
      log(`Import processor warning: ${err.message}`);
    }

    log("Application fully initialized");

  } catch (error: any) {
    log(`Initialization error: ${error.message}`);
    throw error;
  }
}
