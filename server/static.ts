import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // PWA service worker must never be cached, so updates reach users immediately.
  app.get("/sw.js", (_req, res) => {
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.type("application/javascript");
    res.sendFile(path.join(distPath, "sw.js"));
  });
  app.get("/manifest.webmanifest", (_req, res) => {
    res.type("application/manifest+json");
    res.sendFile(path.join(distPath, "manifest.webmanifest"));
  });

  // Serve hashed assets with long-term caching (1 year)
  app.use("/assets", express.static(path.join(distPath, "assets"), {
    maxAge: "1y",
    immutable: true,
    etag: true,
  }));

  // Serve other static files with shorter cache
  app.use(express.static(distPath, {
    maxAge: "1d",
    etag: true,
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
