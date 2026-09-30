/** Read-only review host. Deliberately imports no application server, database or credentials. */
import express from "express";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist/public",
);
const origin = "https://pharmaoasis.co.uk";
const message =
  "This is a read-only website preview. Login, applications, orders and enquiries are disabled here. Please use the live website for trading.";
const allowed =
  /^\/api\/(?:products(?:\/[a-zA-Z0-9_-]+)?|brands|categories|offers(?:\/[a-zA-Z0-9_-]+(?:\/items)?)?|site-settings|company-locations|cms-blocks\/[a-zA-Z0-9_-]+|blog(?:\/[a-zA-Z0-9_-]+)?|blog-categories|featured-brands)$/;
export function createPreviewApp(upstreamFetch = fetch) {
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    next();
  });
  app.get("/healthz", (_req, res) =>
    res.json({ status: "ok", mode: "read-only-review" }),
  );
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD")
      return res.status(403).json({ message });
    next();
  });
  app.get("/api/auth/me", (_req, res) => res.json({ user: null }));
  app.get("/robots.txt", (_req, res) =>
    res.type("text/plain").send("User-agent: *\nDisallow: /\n"),
  );
  app.use(async (req, res, next) => {
    const isImage =
      /^\/objects\/[a-zA-Z0-9/_-]+\.(?:jpeg|jpg|png|webp|gif|svg)$/i.test(
        req.path,
      );
    if (!allowed.test(req.path) && !isImage) return next();
    try {
      // Fixed origin/path allowlist; never forward browser credentials or headers.
      const url = new URL(req.path, origin);
      for (const [key, value] of new URLSearchParams(
        req.url.split("?")[1] || "",
      )) {
        if (
          ["search", "q", "brand", "category", "page", "limit", "sort"].includes(key)
        )
          url.searchParams.set(key, value.slice(0, 200));
      }
      const response = await upstreamFetch(url, {
        headers: { Accept: isImage ? "image/*" : "application/json" },
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        return res
          .status(response.status)
          .json({ message: "Public content is temporarily unavailable." });
      if (req.path === "/api/site-settings") {
        const settings = await response.json();
        const publicSettings = Object.fromEntries(
          Object.entries(settings).filter(([key]) =>
            /^(?:contact_email|contact_phone|whatsapp_number|social_\w+|site_name|site_tagline|active_theme)$/.test(
              key,
            ),
          ),
        );
        return res.json(publicSettings);
      }
      res.set(
        "Content-Type",
        response.headers.get("content-type") || "application/json",
      );
      res.set("Cache-Control", "public, max-age=30");
      res.send(Buffer.from(await response.arrayBuffer()));
    } catch {
      res.status(502).json({
        message:
          "Public content could not be loaded. Please try again shortly.",
      });
    }
  });
  app.use("/api", (_req, res) => res.status(403).json({ message }));
  // A fixed-width frame lets reviewers inspect the real responsive app without device emulation.
  app.get("/__review/mobile", (req, res) =>
    res
      .type("html")
      .send(
        `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mobile review · Pharma Oasis</title><style>body{margin:0;background:#e9e4e7;font:14px Arial;color:#432338}header{padding:14px;text-align:center}iframe{display:block;width:390px;max-width:100%;height:850px;border:0;margin:0 auto;background:white;box-shadow:0 2px 24px #43233822}</style></head><body><header>390px mobile review · <a href="/">Open full website</a></header><iframe title="Pharma Oasis mobile preview" src="${["/", "/products", "/portal", "/portal/quote"].includes(req.query.path) ? req.query.path : "/"}"></iframe></body></html>`,
      ),
  );
  app.use(express.static(root, { index: false, dotfiles: "deny" }));
  app.get("*", async (_req, res) => {
    let html = await readFile(path.join(root, "index.html"), "utf8");
    html = html.replace(
      '<meta name="robots" content="index, follow" />',
      '<meta name="robots" content="noindex, nofollow" />',
    );
    html = html.replace(
      "<body>",
      '<body><div class="po-preview-bar">DESIGN PREVIEW · Sample trade account. No live orders or submissions. <a href="https://pharmaoasis.co.uk" target="_blank" rel="noopener noreferrer">Open the live website ↗</a></div>',
    );
    res.type("html").send(html);
  });
  return app;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  createPreviewApp().listen(Number(process.env.PORT) || 4173, "0.0.0.0", () =>
    console.log("Read-only website review host ready"),
  );
}
