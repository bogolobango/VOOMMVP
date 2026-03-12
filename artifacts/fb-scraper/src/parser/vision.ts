/**
 * Vision-Based Car Identification
 *
 * Uses GPT-4o vision to analyse car images and fill in make, model, year,
 * type, color, and a clean description when text-only LLM parsing is
 * insufficient (e.g. a post with almost no text but multiple photos).
 *
 * Called as a fallback in the ingestion pipeline when:
 *   - The text parser returns "Unknown" for make/model, OR
 *   - The post text is too short (<50 chars) to parse reliably
 */

import OpenAI from "openai";
import type { ParsedCar } from "./llm.js";

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

const VISION_SYSTEM_PROMPT = `You are an expert automotive identifier specialising in cars sold in West Africa (Ghana, Cameroon, Nigeria).

Given one or more car photos, identify the vehicle and return JSON with these exact fields:
{
  "make": string,          // e.g. "Toyota", "Mercedes-Benz", "Kia"
  "model": string,         // e.g. "Corolla", "E-Class", "Sportage"
  "year": number | null,   // best estimate of model year; null if truly unknown
  "type": "Sedan"|"SUV"|"Hatchback"|"Pickup"|"Van"|"Truck"|"Coupe"|"Convertible"|"Wagon"|"Minivan"|"Other",
  "color": string | null,  // dominant exterior color
  "confidence": "high"|"medium"|"low",
  "description": string    // 1-2 sentence professional rental listing description
}

Rules:
- Return ONLY valid JSON. No markdown, no explanation.
- If you cannot identify the specific model, give the best make + approximate model family.
- Set confidence to "low" only if the image is too blurry, cropped, or obscured.
- Write the description as if marketing the car for rental in West Africa.`;

export interface VisionIdentification {
  make: string;
  model: string;
  year: number | null;
  type: ParsedCar["type"];
  color: string | null;
  confidence: "high" | "medium" | "low";
  description: string;
}

/**
 * Identify a car from one or more image URLs using GPT-4o vision.
 * Returns null if identification fails or confidence is too low.
 */
export async function identifyCarFromImages(
  imageUrls: string[]
): Promise<VisionIdentification | null> {
  if (!imageUrls.length) return null;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[vision] OPENAI_API_KEY not set — skipping vision identification.");
    return null;
  }

  const usableUrls = imageUrls.slice(0, 3);

  try {
    const client = getOpenAI();

    const imageContent: OpenAI.ChatCompletionContentPart[] = usableUrls.map((url) => ({
      type: "image_url" as const,
      image_url: { url, detail: "auto" as const },
    }));

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: VISION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            ...imageContent,
            { type: "text", text: "Identify this car and return JSON." },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 400,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw) as VisionIdentification;

    if (!parsed.make || !parsed.model) {
      console.warn("[vision] Vision response missing make/model:", raw);
      return null;
    }

    const validTypes = new Set([
      "Sedan", "SUV", "Hatchback", "Pickup", "Van", "Truck",
      "Coupe", "Convertible", "Wagon", "Minivan", "Other",
    ]);
    if (!validTypes.has(parsed.type)) parsed.type = "Other";

    console.log(
      `[vision] Identified: ${parsed.year ?? "?"} ${parsed.make} ${parsed.model} ` +
        `(${parsed.type}, confidence: ${parsed.confidence})`
    );

    return parsed;
  } catch (err) {
    console.error("[vision] Failed to identify car from image:", err);
    return null;
  }
}

/**
 * Determine whether text-parsed results need vision enrichment.
 * Returns true when make or model looks like a placeholder / too generic.
 */
export function needsVisionEnrichment(parsed: ParsedCar): boolean {
  const unknowns = new Set(["unknown", "car", "vehicle", "auto", "automobile", ""]);
  return (
    unknowns.has(parsed.make.toLowerCase()) ||
    unknowns.has(parsed.model.toLowerCase())
  );
}
