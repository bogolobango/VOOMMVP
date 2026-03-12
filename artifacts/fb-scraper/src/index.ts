/**
 * VOOM Facebook Scraper Service
 *
 * Standalone Express microservice that:
 *   1. Runs the Facebook scraper on a cron schedule (default: every 6 hours)
 *   2. Exposes HTTP endpoints for manual triggering and status monitoring
 *
 * Required environment variables:
 *   DATABASE_URL       — PostgreSQL connection string (shared with api-server)
 *   OPENAI_API_KEY     — OpenAI API key for LLM-based car data parsing
 *   PORT               — HTTP port for the scraper service (e.g. 3001)
 *
 * Optional environment variables:
 *   FB_COOKIES_PATH    — Path to Facebook session cookies JSON file
 *                        (default: ./fb_cookies.json)
 *   SCRAPER_API_KEY    — Secret key to protect the /scraper/trigger endpoint
 *   SCRAPER_CRON_SCHEDULE — Cron expression (default: "0 0 */6 * * *")
 *   PUBLIC_BASE_URL    — Base URL for serving scraped images
 *   IMAGES_DIR         — Directory to save downloaded images
 *   CORS_ORIGIN        — Allowed CORS origin for the API server
 */

import express from "express";
import cors from "cors";
import scraperRouter from "./routes/scraper.js";
import { startScheduler } from "./scheduler/cron.js";

// ── Validate required environment variables ───────────────────────────────────

const required = ["DATABASE_URL", "OPENAI_API_KEY", "PORT"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(
    `[startup] Missing required environment variables: ${missing.join(", ")}`
  );
  process.exit(1);
}

// ── Express app ───────────────────────────────────────────────────────────────

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json());

// Health check
app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", service: "fb-scraper" });
});

// Scraper API routes
app.use("/scraper", scraperRouter);

// ── Start server ──────────────────────────────────────────────────────────────

const port = parseInt(process.env.PORT!, 10);

app.listen(port, () => {
  console.log(`[startup] VOOM Facebook Scraper service listening on port ${port}`);

  // Start the cron scheduler after the server is ready
  startScheduler();
});
