/**
 * Database Ingestion Pipeline
 *
 * Orchestrates the full end-to-end flow from a raw Facebook post to a
 * live, reservable car listing in the VOOM app:
 *
 *   RawPost
 *     → parseCarPost (LLM)          — structured car fields
 *     → downloadPostImages           — persistent image URLs
 *     → upsertHost                   — create/find the seller as a VOOM host user
 *     → publishListing               — insert into `cars` table via storage layer
 *
 * Idempotency is enforced via the dedicated `fb_post_id` column on the cars
 * table (unique constraint). Re-running the scraper for the same post is a
 * safe no-op — the existing listing is returned and counted as "skipped".
 *
 * Every listing is created with:
 *   available = true
 *   status    = "active"
 *   source    = "facebook_scraper"
 *
 * This makes it immediately visible and bookable on the VOOM frontend.
 */

import { db } from "@workspace/db";
import { users, cars } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { RawPost } from "../scraper/facebook.js";
import { parseCarPost } from "../parser/llm.js";
import { downloadPostImages } from "../parser/images.js";
import { publishListing } from "./publish.js";
import { identifyCarFromImages, needsVisionEnrichment } from "../parser/vision.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IngestionResult {
  postId: string;
  status: "created" | "skipped" | "error";
  carId?: number;
  hostId?: number;
  make?: string;
  model?: string;
  year?: number;
  error?: string;
}

export interface PipelineStats {
  total: number;
  created: number;
  skipped: number;
  errors: number;
  results: IngestionResult[];
}

// ── Ingestion pipeline ────────────────────────────────────────────────────────

/**
 * Ingest a batch of raw Facebook posts into the VOOM database.
 * Processes posts sequentially to avoid overwhelming the database or LLM API.
 */
export async function ingestPosts(posts: RawPost[]): Promise<PipelineStats> {
  const stats: PipelineStats = {
    total: posts.length,
    created: 0,
    skipped: 0,
    errors: 0,
    results: [],
  };

  console.log(`[pipeline] Starting ingestion of ${posts.length} posts...`);

  for (const post of posts) {
    const result = await ingestSinglePost(post);
    stats.results.push(result);

    if (result.status === "created") stats.created++;
    else if (result.status === "skipped") stats.skipped++;
    else stats.errors++;

    // Brief pause between posts to avoid hammering the LLM API
    await sleep(400);
  }

  console.log(
    `[pipeline] Ingestion complete — ` +
      `created: ${stats.created}, skipped: ${stats.skipped}, errors: ${stats.errors}`
  );

  return stats;
}

/**
 * Ingest a single raw post. Returns the result status.
 */
async function ingestSinglePost(post: RawPost): Promise<IngestionResult> {
  try {
    // ── Step 1: Idempotency check via fb_post_id column ───────────────────
    const existing = await findExistingListing(post.postId);
    if (existing) {
      console.log(
        `[pipeline] Post ${post.postId} already ingested ` +
          `(carId: ${existing.id}, ${existing.year} ${existing.make} ${existing.model}) — skipping.`
      );
      return {
        postId: post.postId,
        status: "skipped",
        carId: existing.id,
        hostId: existing.hostId,
        make: existing.make,
        model: existing.model,
        year: existing.year,
      };
    }

    // ── Step 2: Parse car data via LLM ────────────────────────────────────
    console.log(
      `[pipeline] Parsing post ${post.postId} (seller: "${post.sellerName}") | ${post.text.length} chars | ${post.imageUrls.length} images`
    );
    const parsed = await parseCarPost(post);

    if (!parsed) {
      console.log(
        `[pipeline] Post ${post.postId} is not a valid car listing — skipping.`
      );
      return { postId: post.postId, status: "skipped" };
    }

    // ── Step 2b: Vision enrichment when text parsing is insufficient ──────
    if (needsVisionEnrichment(parsed) && post.imageUrls.length > 0) {
      console.log(
        `[pipeline] Text parsing returned unknown make/model for ${post.postId} — trying vision identification...`
      );
      const vision = await identifyCarFromImages(post.imageUrls);
      if (vision && vision.confidence !== "low") {
        console.log(
          `[pipeline] Vision identified: ${vision.year ?? "?"} ${vision.make} ${vision.model} ` +
            `(confidence: ${vision.confidence})`
        );
        parsed.make = vision.make;
        parsed.model = vision.model;
        if (vision.year) parsed.year = vision.year;
        parsed.type = vision.type;
        if (vision.color) parsed.color = vision.color;
        if (vision.description && parsed.description.length < 100) {
          parsed.description = vision.description;
        }
      } else {
        console.log(
          `[pipeline] Vision identification failed or low confidence — keeping text-parsed data.`
        );
      }
    }

    // ── Step 3: Download and persist images ───────────────────────────────
    let imageUrls: string[] = [];
    if (post.imageUrls.length > 0) {
      console.log(
        `[pipeline] Downloading ${post.imageUrls.length} image(s) for post ${post.postId}...`
      );
      imageUrls = await downloadPostImages(post.imageUrls, post.postId);
      console.log(
        `[pipeline] Downloaded ${imageUrls.length} image(s) successfully.`
      );
    }

    // ── Step 4: Upsert the Facebook seller as a VOOM host user ───────────
    const host = await upsertHost(post);
    console.log(
      `[pipeline] Host resolved — userId: ${host.id}, username: "${host.username}"`
    );

    // ── Step 5: Publish the listing to the VOOM app ───────────────────────
    const car = await publishListing({
      host,
      parsed,
      imageUrls,
      fbPostId: post.postId,
      fbSellerProfileUrl: post.sellerProfileUrl,
    });

    console.log(
      `[pipeline] ✔ Published listing — carId: ${car.id}, ` +
        `${car.year} ${car.make} ${car.model}, ` +
        `GHS ${car.dailyRate}/day, ${car.location}`
    );

    return {
      postId: post.postId,
      status: "created",
      carId: car.id,
      hostId: host.id,
      make: car.make,
      model: car.model,
      year: car.year,
    };
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error(`[pipeline] ✖ Error ingesting post ${post.postId}:`, message);
    return { postId: post.postId, status: "error", error: message };
  }
}

// ── Host upsert ───────────────────────────────────────────────────────────────

/**
 * Find or create a VOOM user account for the Facebook seller.
 * Uses a deterministic username derived from the seller's profile URL or name.
 * The account is created with isHost: true so their listings are immediately
 * visible in the host dashboard.
 */
async function upsertHost(
  post: RawPost
): Promise<typeof users.$inferSelect> {
  const username = deriveUsername(post);

  // Check if a user with this username already exists
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.username, username));

  if (existing) return existing;

  // Create a new managed host account for this Facebook seller
  const [newUser] = await db
    .insert(users)
    .values({
      username,
      // Placeholder password — this account is managed by the scraper.
      // The seller can claim it later via a "claim your listing" flow.
      password: `fb_managed_${randomHex(16)}`,
      fullName: post.sellerName,
      profilePicture: post.sellerProfilePicture ?? undefined,
      role: "both",
      isHost: true,
      isVerified: false,
      verificationStatus: "unverified",
    })
    .returning();

  console.log(
    `[pipeline] Created new host user — userId: ${newUser.id}, username: "${newUser.username}"`
  );

  return newUser;
}

// ── Idempotency check ─────────────────────────────────────────────────────────

/**
 * Check if a car listing for this Facebook post ID already exists.
 * Uses the dedicated `fb_post_id` column with a unique constraint.
 */
async function findExistingListing(
  postId: string
): Promise<typeof cars.$inferSelect | null> {
  const [found] = await db
    .select()
    .from(cars)
    .where(eq(cars.fbPostId, postId));

  return found ?? null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Derive a stable, unique username from a Facebook profile URL or seller name.
 */
function deriveUsername(post: RawPost): string {
  // Try to extract a clean handle from the profile URL
  const urlMatch = post.sellerProfileUrl.match(
    /facebook\.com\/(?:profile\.php\?id=)?([a-zA-Z0-9._-]+)/
  );
  if (urlMatch && urlMatch[1] && urlMatch[1] !== "profile.php") {
    return `fb_${urlMatch[1].toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 30)}`;
  }

  // Fallback: sanitize the seller's display name
  const sanitized = post.sellerName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 25);

  return `fb_${sanitized}_${randomHex(4)}`;
}

function randomHex(bytes: number): string {
  return Array.from({ length: bytes }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
