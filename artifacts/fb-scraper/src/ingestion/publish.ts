/**
 * Listing Publisher
 *
 * Responsible for the final step of the pipeline: taking fully parsed and
 * validated car data and writing it to the VOOM database as a live listing.
 *
 * This module calls the shared `@workspace/db` storage layer directly —
 * the same layer used by the api-server — rather than going through the
 * HTTP API. This approach:
 *
 *   1. Bypasses the rate limiter on POST /api/cars (5 req/min) which would
 *      throttle bulk imports.
 *   2. Avoids the need to manage an HTTP session cookie for the scraper.
 *   3. Keeps the scraper and api-server in sync: any schema change in
 *      @workspace/db is automatically reflected in both services.
 *
 * The listing is created with:
 *   available = true   → immediately visible in the VOOM app
 *   status    = "active" → returned by all getCars() queries
 *   source    = "facebook_scraper" → distinguishable from manual listings
 */

import { db } from "@workspace/db";
import { cars, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Car } from "@workspace/db";
import type { ParsedCar } from "../parser/llm.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PublishInput {
  host: typeof users.$inferSelect;
  parsed: ParsedCar;
  imageUrls: string[];
  fbPostId: string;
  fbSellerProfileUrl: string;
}

// ── Publisher ─────────────────────────────────────────────────────────────────

/**
 * Insert a new car listing into the VOOM database and mark the host user
 * as a verified host. Returns the fully persisted Car record.
 *
 * The listing is immediately live and bookable:
 *   - `available: true`  — shows up in search results
 *   - `status: "active"` — passes the status filter in getCars()
 *   - `source: "facebook_scraper"` — traceable origin
 */
export async function publishListing(input: PublishInput): Promise<Car> {
  const { host, parsed, imageUrls, fbPostId, fbSellerProfileUrl } = input;

  // ── Insert the car listing ────────────────────────────────────────────────
  const [car] = await db
    .insert(cars)
    .values({
      hostId: host.id,

      // Core fields parsed by the LLM
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

      // Images — first image is the primary thumbnail
      imageUrl: imageUrls[0] ?? null,
      images: imageUrls.length > 0 ? imageUrls : undefined,

      // Optional enriched fields
      color: parsed.color ?? undefined,
      transmission: parsed.transmission ?? undefined,
      fuelType: parsed.fuelType ?? undefined,
      seats: parsed.seats ?? undefined,

      // Listing state — immediately live and bookable
      available: true,
      status: "active",

      // Provenance tracking
      source: "facebook_scraper",
      fbPostId,
      fbSellerProfileUrl,
    })
    .returning();

  // ── Ensure the host user is flagged as a host ─────────────────────────────
  // This is a no-op if they are already a host, but ensures consistency.
  if (!host.isHost || host.role !== "both") {
    await db
      .update(users)
      .set({ isHost: true, role: "both" })
      .where(eq(users.id, host.id));
  }

  return car;
}
