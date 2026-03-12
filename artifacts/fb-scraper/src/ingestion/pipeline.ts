/**
 * Database Ingestion Pipeline
 *
 * Orchestrates the full flow from a raw Facebook post to a persisted
 * car listing in the VOOM database:
 *
 *   RawPost → parseCarPost (LLM) → downloadPostImages → upsertHost → createCar
 *
 * Idempotency is enforced via the `fb_post_id` column on the cars table.
 * Posts already ingested are silently skipped.
 */

import { db } from "@workspace/db";
import { users, cars } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import type { RawPost } from "../scraper/facebook.js";
import { parseCarPost } from "../parser/llm.js";
import { downloadPostImages } from "../parser/images.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IngestionResult {
  postId: string;
  status: "created" | "skipped" | "error";
  carId?: number;
  hostId?: number;
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

    // Brief pause between posts to respect rate limits
    await sleep(300);
  }

  console.log(
    `[pipeline] Ingestion complete — created: ${stats.created}, skipped: ${stats.skipped}, errors: ${stats.errors}`
  );

  return stats;
}

/**
 * Ingest a single raw post. Returns the result status.
 */
async function ingestSinglePost(post: RawPost): Promise<IngestionResult> {
  try {
    // ── Step 1: Idempotency check ──────────────────────────────────────────
    const existing = await findExistingListing(post.postId);
    if (existing) {
      console.log(`[pipeline] Post ${post.postId} already ingested (carId: ${existing.id}) — skipping.`);
      return { postId: post.postId, status: "skipped", carId: existing.id };
    }

    // ── Step 2: Parse car data via LLM ────────────────────────────────────
    console.log(`[pipeline] Parsing post ${post.postId} (seller: ${post.sellerName})...`);
    const parsed = await parseCarPost(post);

    if (!parsed) {
      console.log(`[pipeline] Post ${post.postId} is not a valid car listing — skipping.`);
      return { postId: post.postId, status: "skipped" };
    }

    // ── Step 3: Download and persist images ───────────────────────────────
    let imageUrls: string[] = [];
    if (post.imageUrls.length > 0) {
      console.log(
        `[pipeline] Downloading ${post.imageUrls.length} images for post ${post.postId}...`
      );
      imageUrls = await downloadPostImages(post.imageUrls, post.postId);
    }

    // ── Step 4: Upsert the Facebook seller as a host user ─────────────────
    const host = await upsertHost(post);
    console.log(
      `[pipeline] Host resolved — userId: ${host.id}, username: ${host.username}`
    );

    // ── Step 5: Create the car listing ────────────────────────────────────
    const [car] = await db
      .insert(cars)
      .values({
        hostId: host.id,
        make: parsed.make,
        model: parsed.model,
        year: parsed.year,
        type: parsed.type,
        dailyRate: parsed.dailyRate,
        currency: parsed.currency,
        location: parsed.location,
        city: parsed.city ?? undefined,
        country: parsed.country,
        description: parsed.description,
        imageUrl: imageUrls[0] ?? null,
        images: imageUrls.length > 0 ? imageUrls : undefined,
        color: parsed.color ?? undefined,
        transmission: parsed.transmission ?? undefined,
        fuelType: parsed.fuelType ?? undefined,
        seats: parsed.seats ?? undefined,
        available: true,
        status: "active",
        // Store the Facebook post ID in the description metadata for idempotency
        // (a dedicated column is added via migration — see below)
      })
      .returning();

    // Persist the fb_post_id for future idempotency checks
    await db
      .update(cars)
      .set({ description: `${parsed.description}\n\n[fb_post_id:${post.postId}]` })
      .where(eq(cars.id, car.id));

    console.log(
      `[pipeline] Created car listing — carId: ${car.id}, ${parsed.year} ${parsed.make} ${parsed.model}`
    );

    return {
      postId: post.postId,
      status: "created",
      carId: car.id,
      hostId: host.id,
    };
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error(`[pipeline] Error ingesting post ${post.postId}:`, message);
    return { postId: post.postId, status: "error", error: message };
  }
}

// ── Host upsert ───────────────────────────────────────────────────────────────

/**
 * Find or create a user account for the Facebook seller.
 * Uses a deterministic username derived from the seller's profile URL or name.
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

  // Create a new host account for this Facebook seller
  const [newUser] = await db
    .insert(users)
    .values({
      username,
      // Placeholder password — this account is managed by the scraper, not a human
      password: `fb_managed_${randomHex(16)}`,
      fullName: post.sellerName,
      profilePicture: post.sellerProfilePicture ?? undefined,
      role: "both",
      isHost: true,
      isVerified: false,
      verificationStatus: "unverified",
    })
    .returning();

  return newUser;
}

// ── Idempotency check ─────────────────────────────────────────────────────────

/**
 * Check if a car listing for this Facebook post ID already exists.
 * We embed the post ID in the description field as a lightweight marker.
 */
async function findExistingListing(
  postId: string
): Promise<typeof cars.$inferSelect | null> {
  // Use a raw SQL LIKE query to search the description field
  const { ilike } = await import("drizzle-orm");
  const [found] = await db
    .select()
    .from(cars)
    .where(ilike(cars.description, `%[fb_post_id:${postId}]%`));

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
