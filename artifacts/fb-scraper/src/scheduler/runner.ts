/**
 * Pipeline Runner
 *
 * Top-level orchestrator that wires together:
 *   1. Facebook scraper  →  raw posts
 *   2. LLM parser        →  structured car data
 *   3. DB ingestion      →  persisted listings
 *
 * Used by both the cron scheduler and the CLI.
 */

import { scrapeFacebookGroup } from "../scraper/facebook.js";
import { ingestPosts, type PipelineStats } from "../ingestion/pipeline.js";

export interface RunOptions {
  /** Maximum age of posts to collect, in hours. Default: 48 */
  maxAgeHours?: number;
}

/**
 * Execute the full scrape → parse → ingest pipeline.
 */
export async function runScraperPipeline(
  options: RunOptions = {}
): Promise<PipelineStats> {
  const maxAgeHours = options.maxAgeHours ?? 48;

  console.log(
    `[runner] Starting Facebook scraper pipeline (window: ${maxAgeHours}h)`
  );

  // Step 1: Scrape Facebook
  const rawPosts = await scrapeFacebookGroup(maxAgeHours);
  console.log(`[runner] Scraped ${rawPosts.length} posts from Facebook.`);

  if (rawPosts.length === 0) {
    console.log("[runner] No posts found in the time window. Pipeline complete.");
    return { total: 0, created: 0, skipped: 0, errors: 0, results: [] };
  }

  // Step 2 & 3: Parse + Ingest
  const stats = await ingestPosts(rawPosts);

  return stats;
}
