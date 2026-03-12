/**
 * Scraper API Routes
 *
 * Exposes HTTP endpoints so the VOOM backend (or an admin dashboard)
 * can trigger and monitor the Facebook scraper without SSH access.
 *
 * Routes:
 *   POST /scraper/trigger        — Start a scrape run (async)
 *   GET  /scraper/status         — Get the status of the last/current run
 *   GET  /scraper/listings        — List recently scraped car IDs
 */

import { Router, type Request, type Response } from "express";
import { runScraperPipeline } from "../scheduler/runner.js";
import type { PipelineStats } from "../ingestion/pipeline.js";

const router = Router();

// ── In-memory run state ───────────────────────────────────────────────────────

interface RunState {
  status: "idle" | "running" | "completed" | "failed";
  startedAt: string | null;
  completedAt: string | null;
  lastStats: PipelineStats | null;
  error: string | null;
}

const runState: RunState = {
  status: "idle",
  startedAt: null,
  completedAt: null,
  lastStats: null,
  error: null,
};

// ── POST /scraper/trigger ─────────────────────────────────────────────────────

router.post("/trigger", async (req: Request, res: Response) => {
  // Validate the internal API key to prevent unauthorized triggers
  const apiKey = req.headers["x-scraper-api-key"];
  const expectedKey = process.env.SCRAPER_API_KEY;

  if (expectedKey && apiKey !== expectedKey) {
    return res.status(401).json({ message: "Unauthorized: invalid API key" });
  }

  if (runState.status === "running") {
    return res.status(409).json({
      message: "A scraper run is already in progress.",
      startedAt: runState.startedAt,
    });
  }

  const maxAgeHours = req.body?.maxAgeHours
    ? parseInt(req.body.maxAgeHours, 10)
    : 48;

  // Respond immediately — run is async
  res.status(202).json({
    message: "Scraper run triggered.",
    maxAgeHours,
    startedAt: new Date().toISOString(),
  });

  // Run in background
  runState.status = "running";
  runState.startedAt = new Date().toISOString();
  runState.completedAt = null;
  runState.error = null;

  runScraperPipeline({ maxAgeHours })
    .then((stats) => {
      runState.status = "completed";
      runState.completedAt = new Date().toISOString();
      runState.lastStats = stats;
      console.log(
        `[routes] Triggered run complete — created: ${stats.created}, skipped: ${stats.skipped}`
      );
    })
    .catch((err) => {
      runState.status = "failed";
      runState.completedAt = new Date().toISOString();
      runState.error = (err as Error).message ?? String(err);
      console.error("[routes] Triggered run failed:", runState.error);
    });
});

// ── GET /scraper/status ───────────────────────────────────────────────────────

router.get("/status", (_req: Request, res: Response) => {
  return res.json(runState);
});

// ── GET /scraper/listings ─────────────────────────────────────────────────────

router.get("/listings", async (_req: Request, res: Response) => {
  try {
    const { db } = await import("@workspace/db");
    const { cars } = await import("@workspace/db");
    const { desc, ilike } = await import("drizzle-orm");

    // Return the most recent scraped listings (those with fb_post_id marker)
    const scraped = await db
      .select({
        id: cars.id,
        make: cars.make,
        model: cars.model,
        year: cars.year,
        location: cars.location,
        dailyRate: cars.dailyRate,
        currency: cars.currency,
        imageUrl: cars.imageUrl,
        createdAt: cars.createdAt,
      })
      .from(cars)
      .where(ilike(cars.description, "%[fb_post_id:%]%"))
      .orderBy(desc(cars.createdAt))
      .limit(50);

    return res.json({ count: scraped.length, listings: scraped });
  } catch (err) {
    console.error("[routes] Error fetching scraped listings:", err);
    return res.status(500).json({ message: "Failed to fetch scraped listings" });
  }
});

export default router;
