/**
 * Image Downloader & Uploader
 *
 * Facebook CDN image URLs are session-scoped and expire quickly.
 * This module downloads images from Facebook and re-uploads them to
 * a persistent store (local filesystem by default, S3 if configured).
 */

import axios from "axios";
import { createWriteStream, mkdirSync, existsSync } from "fs";
import { writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// ── Configuration ─────────────────────────────────────────────────────────────

const IMAGES_DIR = process.env.IMAGES_DIR
  ? path.resolve(process.env.IMAGES_DIR)
  : path.resolve(process.cwd(), "public", "scraped-images");

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UploadedImage {
  /** Public URL to access the image */
  publicUrl: string;
  /** Local filesystem path (if stored locally) */
  localPath: string | null;
}

// ── Ensure image directory exists ─────────────────────────────────────────────

function ensureImageDir(): void {
  if (!existsSync(IMAGES_DIR)) {
    mkdirSync(IMAGES_DIR, { recursive: true });
  }
}

// ── Download a single image ───────────────────────────────────────────────────

/**
 * Download a single image from a URL and save it locally.
 * Returns the public URL and local path, or null on failure.
 */
export async function downloadImage(
  imageUrl: string,
  postId: string,
  index: number
): Promise<UploadedImage | null> {
  try {
    ensureImageDir();

    const response = await axios.get<ArrayBuffer>(imageUrl, {
      responseType: "arraybuffer",
      timeout: 15_000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://www.facebook.com/",
      },
      maxRedirects: 5,
    });

    // Determine file extension from Content-Type header
    const contentType = response.headers["content-type"] as string ?? "image/jpeg";
    const ext = contentTypeToExt(contentType);
    const filename = `fb_${postId}_${index}_${randomUUID().slice(0, 8)}${ext}`;
    const localPath = path.join(IMAGES_DIR, filename);

    await writeFile(localPath, Buffer.from(response.data));

    const publicUrl = `${PUBLIC_BASE_URL}/scraped-images/${filename}`;

    return { publicUrl, localPath };
  } catch (err) {
    console.warn(
      `[images] Failed to download image ${index} for post ${postId}:`,
      (err as Error).message
    );
    return null;
  }
}

/**
 * Download all images for a post, returning an array of public URLs.
 * Limits to a maximum of 8 images per post to avoid overloading storage.
 */
export async function downloadPostImages(
  imageUrls: string[],
  postId: string,
  maxImages = 8
): Promise<string[]> {
  const limited = imageUrls.slice(0, maxImages);
  const results = await Promise.allSettled(
    limited.map((url, i) => downloadImage(url, postId, i))
  );

  const publicUrls: string[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      publicUrls.push(result.value.publicUrl);
    }
  }

  return publicUrls;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function contentTypeToExt(contentType: string): string {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("gif")) return ".gif";
  return ".jpg";
}
