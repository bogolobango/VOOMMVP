/**
 * LLM Car Data Parser
 *
 * Uses OpenAI to extract structured car listing fields from unstructured
 * Facebook post text. Falls back to regex heuristics when the API is
 * unavailable or the response is malformed.
 */

import OpenAI from "openai";
import { z } from "zod";
import type { RawPost } from "../scraper/facebook.js";

// ── Structured output schema ──────────────────────────────────────────────────

export const ParsedCarSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1980).max(new Date().getFullYear() + 1),
  type: z.enum([
    "Sedan",
    "SUV",
    "Hatchback",
    "Pickup",
    "Van",
    "Truck",
    "Coupe",
    "Convertible",
    "Wagon",
    "Minivan",
    "Other",
  ]),
  transmission: z.enum(["Automatic", "Manual", "CVT"]).nullable(),
  fuelType: z.enum(["Petrol", "Diesel", "Hybrid", "Electric"]).nullable(),
  color: z.string().nullable(),
  seats: z.number().int().min(1).max(20).nullable(),
  dailyRate: z.number().int().min(0),
  currency: z.string().default("GHS"),
  location: z.string().min(1),
  city: z.string().nullable(),
  country: z.string().default("Ghana"),
  description: z.string(),
  isCarListing: z.boolean(),
});

export type ParsedCar = z.infer<typeof ParsedCarSchema>;

// ── OpenAI client ─────────────────────────────────────────────────────────────

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a car listing data extractor for a Ghanaian car rental marketplace.
Your task is to parse raw Facebook post text from a car dealers group and extract structured information.

Rules:
- Extract the car make (brand), model, year, body type, transmission, fuel type, color, and seat count.
- The price is usually in GHS (Ghana Cedis). Extract the numeric daily rental rate.
  If the post shows a sale price (e.g. GHS150,000), estimate a reasonable daily rental rate
  by dividing by 1000 (e.g. GHS 150 per day). Never return 0.
- Extract the location. If only a neighborhood is given, infer the city as "Accra" and country as "Ghana".
- Write a clean, professional description in English summarizing the listing.
- Set isCarListing to false if the post is clearly not a car for sale/rent (e.g. spare parts, services).
- Respond ONLY with valid JSON matching the schema. No markdown, no explanation.

Schema:
{
  "make": string,
  "model": string,
  "year": number,
  "type": "Sedan"|"SUV"|"Hatchback"|"Pickup"|"Van"|"Truck"|"Coupe"|"Convertible"|"Wagon"|"Minivan"|"Other",
  "transmission": "Automatic"|"Manual"|"CVT"|null,
  "fuelType": "Petrol"|"Diesel"|"Hybrid"|"Electric"|null,
  "color": string|null,
  "seats": number|null,
  "dailyRate": number,
  "currency": "GHS",
  "location": string,
  "city": string|null,
  "country": "Ghana",
  "description": string,
  "isCarListing": boolean
}`;

// ── Main parser function ───────────────────────────────────────────────────────

/**
 * Parse a raw Facebook post into structured car listing data using an LLM.
 * Falls back to regex heuristics if the LLM call fails.
 */
export async function parseCarPost(post: RawPost): Promise<ParsedCar | null> {
  const userContent = buildUserPrompt(post);

  try {
    const client = getOpenAI();
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) {
      console.warn("[parser] LLM returned empty response for post:", post.postId);
      return fallbackParse(post);
    }

    const parsed = JSON.parse(raw);
    const validated = ParsedCarSchema.safeParse(parsed);

    if (!validated.success) {
      console.warn(
        "[parser] LLM response failed schema validation for post:",
        post.postId,
        validated.error.flatten()
      );
      return fallbackParse(post);
    }

    if (!validated.data.isCarListing) {
      console.log(`[parser] Post ${post.postId} is not a car listing — skipping.`);
      return null;
    }

    return validated.data;
  } catch (err) {
    console.error("[parser] LLM parse error for post:", post.postId, err);
    return fallbackParse(post);
  }
}

/**
 * Build the user-facing prompt from a raw post.
 */
function buildUserPrompt(post: RawPost): string {
  const lines: string[] = [
    `Seller: ${post.sellerName}`,
    `Post text:\n${post.text}`,
  ];

  if (post.rawPrice) lines.push(`Price shown: ${post.rawPrice}`);
  if (post.rawLocation) lines.push(`Location shown: ${post.rawLocation}`);

  return lines.join("\n\n");
}

// ── Regex fallback ────────────────────────────────────────────────────────────

/**
 * Heuristic fallback parser using regex patterns common in Ghanaian car ads.
 * Returns null if the post cannot be reasonably identified as a car listing.
 */
function fallbackParse(post: RawPost): ParsedCar | null {
  const text = post.text.toUpperCase();

  // Must contain at least a recognisable car brand to be considered a listing
  const knownMakes = [
    "TOYOTA", "HONDA", "HYUNDAI", "KIA", "NISSAN", "FORD", "MERCEDES",
    "BMW", "AUDI", "VOLKSWAGEN", "VW", "LEXUS", "LAND ROVER", "RANGE ROVER",
    "MITSUBISHI", "MAZDA", "SUBARU", "JEEP", "CHEVROLET", "PEUGEOT",
    "RENAULT", "VOLVO", "SUZUKI", "ISUZU", "OPEL", "SKODA", "SEAT",
    "INFINITI", "ACURA", "BUICK", "CADILLAC", "GMC", "DODGE",
  ];

  const makeFound = knownMakes.find((m) => text.includes(m));
  if (!makeFound) return null;

  // Year
  const yearMatch = text.match(/\b(19[89]\d|20[012]\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

  // Price — convert sale price to estimated daily rate
  let dailyRate = 200; // default fallback
  const priceStr = post.rawPrice ?? text;
  const priceMatch = priceStr.replace(/,/g, "").match(/(\d{4,})/);
  if (priceMatch) {
    const salePrice = parseInt(priceMatch[1], 10);
    dailyRate = Math.max(50, Math.round(salePrice / 1000));
  }

  // Location
  const location =
    post.rawLocation ??
    (text.match(/LOCATION[:\s]+([A-Z\s,]+)/)?.[1]?.trim() ?? "Accra, Ghana");

  // Transmission
  const transmission: "Automatic" | "Manual" | null = text.includes("AUTOMATIC")
    ? "Automatic"
    : text.includes("MANUAL")
    ? "Manual"
    : null;

  // Body type
  let type: ParsedCar["type"] = "Sedan";
  if (text.includes("SUV") || text.includes("HIGHLANDER") || text.includes("PRADO")) type = "SUV";
  else if (text.includes("PICKUP") || text.includes("HILUX") || text.includes("RANGER")) type = "Pickup";
  else if (text.includes("VAN") || text.includes("HIACE")) type = "Van";
  else if (text.includes("TRUCK")) type = "Truck";
  else if (text.includes("HATCHBACK") || text.includes("YARIS") || text.includes("POLO")) type = "Hatchback";

  // Model — take the word(s) immediately after the make
  const makeIdx = text.indexOf(makeFound);
  const afterMake = text.slice(makeIdx + makeFound.length).trim();
  const modelMatch = afterMake.match(/^([A-Z0-9\-]+(?:\s[A-Z0-9\-]+)?)/);
  const model = modelMatch ? modelMatch[1].trim() : "Unknown";

  return {
    make: makeFound.charAt(0) + makeFound.slice(1).toLowerCase(),
    model: model.charAt(0) + model.slice(1).toLowerCase(),
    year,
    type,
    transmission,
    fuelType: null,
    color: null,
    seats: null,
    dailyRate,
    currency: "GHS",
    location,
    city: location.split(",")[0]?.trim() ?? "Accra",
    country: "Ghana",
    description: post.text.slice(0, 500),
    isCarListing: true,
  };
}
