/**
 * CLI Runner
 *
 * Manually trigger the Facebook scraper pipeline from the command line.
 *
 * Usage:
 *   pnpm --filter @workspace/fb-scraper run scrape
 *   pnpm --filter @workspace/fb-scraper run scrape -- --hours 24
 *
 * Environment variables required:
 *   DATABASE_URL     — PostgreSQL connection string
 *   OPENAI_API_KEY   — OpenAI API key for LLM parsing
 *   FB_COOKIES_PATH  — Path to the Facebook session cookies JSON file
 *
 * Optional:
 *   PUBLIC_BASE_URL  — Base URL for serving scraped images (default: http://localhost:3000)
 *   IMAGES_DIR       — Directory to save downloaded images
 */

import { runScraperPipeline } from "./scheduler/runner.js";

async function main() {
  // Parse --hours argument
  const hoursArg = process.argv.find((arg) => arg.startsWith("--hours="));
  const hoursValue = hoursArg
    ? parseInt(hoursArg.split("=")[1], 10)
    : process.argv.includes("--hours")
    ? parseInt(process.argv[process.argv.indexOf("--hours") + 1], 10)
    : 48;

  const maxAgeHours = isNaN(hoursValue) ? 48 : hoursValue;

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  VOOM Facebook Scraper — Manual Run");
  console.log(`  Time window: last ${maxAgeHours} hours`);
  console.log(`  Started at:  ${new Date().toISOString()}`);
  console.log("═══════════════════════════════════════════════════════════");

  try {
    const stats = await runScraperPipeline({ maxAgeHours });

    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("  Pipeline Results");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`  Total posts scraped : ${stats.total}`);
    console.log(`  Listings created    : ${stats.created}`);
    console.log(`  Posts skipped       : ${stats.skipped}`);
    console.log(`  Errors              : ${stats.errors}`);
    console.log("═══════════════════════════════════════════════════════════\n");

    if (stats.errors > 0) {
      console.log("Failed posts:");
      stats.results
        .filter((r) => r.status === "error")
        .forEach((r) => console.log(`  - Post ${r.postId}: ${r.error}`));
    }

    process.exit(stats.errors > 0 ? 1 : 0);
  } catch (err) {
    console.error("\n[cli] Fatal error:", err);
    process.exit(1);
  }
}

main();
