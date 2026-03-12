/**
 * Scraper Proxy Route
 *
 * Exposes scraper management endpoints on the main API server so the
 * frontend admin dashboard can trigger and monitor scraping runs without
 * needing to know the internal fb-scraper service URL.
 *
 * All requests are forwarded to the fb-scraper microservice.
 * Requires the caller to be authenticated as an admin user.
 *
 * Routes (mounted at /api/scraper):
 *   POST /api/scraper/trigger   — Trigger a new scrape run
 *   GET  /api/scraper/status    — Get current run status
 *   GET  /api/scraper/listings  — List recently scraped car listings
 */

import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const SCRAPER_SERVICE_URL =
  process.env.SCRAPER_SERVICE_URL ?? "http://localhost:3001";

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY ?? "";

/**
 * Middleware: require admin role to access scraper management endpoints.
 */
function requireAdmin(req: Request, res: Response, next: () => void) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  return next();
}

/**
 * Forward a request to the fb-scraper service and relay the response.
 */
async function forwardToScraper(
  req: Request,
  res: Response,
  method: "GET" | "POST",
  path: string,
  body?: object
): Promise<void> {
  try {
    const url = `${SCRAPER_SERVICE_URL}/scraper${path}`;
    const fetchRes = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-scraper-api-key": SCRAPER_API_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await fetchRes.json();
    res.status(fetchRes.status).json(data);
  } catch (err) {
    console.error("[scraper-proxy] Failed to reach fb-scraper service:", err);
    res.status(503).json({
      message:
        "Facebook scraper service is unavailable. " +
        "Ensure the fb-scraper service is running.",
    });
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.post("/trigger", requireAdmin, async (req: Request, res: Response) => {
  await forwardToScraper(req, res, "POST", "/trigger", {
    maxAgeHours: req.body?.maxAgeHours ?? 48,
  });
});

router.get("/status", requireAdmin, async (req: Request, res: Response) => {
  await forwardToScraper(req, res, "GET", "/status");
});

router.get("/listings", requireAdmin, async (req: Request, res: Response) => {
  await forwardToScraper(req, res, "GET", "/listings");
});

export default router;
