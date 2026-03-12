/**
 * Cron Scheduler
 *
 * Runs the Facebook scraping pipeline on a configurable schedule.
 * Default: every 6 hours. Override with SCRAPER_CRON_SCHEDULE env var.
 *
 * Cron format: second minute hour day month weekday
 * Example schedules:
 *   "0 0 */6 * * *"   — every 6 hours (default)
 *   "0 0 */12 * * *"  — every 12 hours
 *   "0 0 8,20 * * *"  — at 8 AM and 8 PM daily
 */

import cron from "node-cron";
import { runScraperPipeline } from "./runner.js";

// Default: every 6 hours
const DEFAULT_SCHEDULE = "0 0 */6 * * *";

let isRunning = false;

/**
 * Start the cron scheduler. The scraper will run immediately on startup
 * and then on the configured schedule thereafter.
 */
export function startScheduler(): void {
  const schedule = process.env.SCRAPER_CRON_SCHEDULE ?? DEFAULT_SCHEDULE;

  if (!cron.validate(schedule)) {
    throw new Error(
      `[scheduler] Invalid cron expression: "${schedule}". ` +
        "Please check the SCRAPER_CRON_SCHEDULE environment variable."
    );
  }

  console.log(`[scheduler] Starting with schedule: "${schedule}"`);

  // Run immediately on startup
  runWithGuard().catch((err) =>
    console.error("[scheduler] Initial run failed:", err)
  );

  // Schedule recurring runs
  cron.schedule(schedule, () => {
    runWithGuard().catch((err) =>
      console.error("[scheduler] Scheduled run failed:", err)
    );
  });

  console.log("[scheduler] Cron job registered. Waiting for next trigger...");
}

/**
 * Guard against concurrent runs — if a scrape is already in progress,
 * skip the new trigger and log a warning.
 */
async function runWithGuard(): Promise<void> {
  if (isRunning) {
    console.warn("[scheduler] Scraper is already running — skipping this trigger.");
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    console.log(`[scheduler] ▶ Scraper run started at ${new Date().toISOString()}`);
    const stats = await runScraperPipeline();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `[scheduler] ✔ Run complete in ${elapsed}s — ` +
        `created: ${stats.created}, skipped: ${stats.skipped}, errors: ${stats.errors}`
    );
  } catch (err) {
    console.error("[scheduler] ✖ Run failed:", err);
  } finally {
    isRunning = false;
  }
}
