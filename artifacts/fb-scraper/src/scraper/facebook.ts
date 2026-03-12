/**
 * Facebook Group Scraper
 *
 * Uses Playwright with stealth mode to scrape car listings from the
 * CAR DEALERS GHANA Buy & Sell group. Supports cookie-based session
 * injection to bypass the login wall.
 */

import { chromium, type Browser, type Page, type BrowserContext } from "playwright";
import { readFileSync, existsSync } from "fs";
import path from "path";

export const FB_GROUP_URL =
  "https://www.facebook.com/groups/cardealersghana/buy_sell_discussion";

export interface RawPost {
  /** Facebook post ID extracted from the post URL */
  postId: string;
  /** Seller's display name */
  sellerName: string;
  /** Absolute URL to the seller's Facebook profile */
  sellerProfileUrl: string;
  /** Seller's profile picture URL */
  sellerProfilePicture: string | null;
  /** Full text content of the post */
  text: string;
  /** ISO-8601 timestamp of the post */
  postedAt: string;
  /** All image URLs found in the post */
  imageUrls: string[];
  /** Price string as displayed on Facebook (e.g. "GHS150,000") */
  rawPrice: string | null;
  /** Location string as displayed on Facebook (e.g. "ACCRA, GREATER ACCRA") */
  rawLocation: string | null;
}

/**
 * Load Facebook session cookies from a JSON file.
 * The file should be an array of Playwright-compatible cookie objects.
 * Generate it by logging in manually and exporting cookies with a browser extension.
 */
function loadSessionCookies(): object[] | null {
  const cookiePath = process.env.FB_COOKIES_PATH
    ? path.resolve(process.env.FB_COOKIES_PATH)
    : path.resolve(process.cwd(), "fb_cookies.json");

  if (!existsSync(cookiePath)) {
    console.warn(
      `[scraper] No cookies file found at ${cookiePath}. ` +
        "Set FB_COOKIES_PATH env var or place fb_cookies.json in the working directory. " +
        "Proceeding without authentication — only public preview will be available."
    );
    return null;
  }

  try {
    const raw = readFileSync(cookiePath, "utf-8");
    return JSON.parse(raw) as object[];
  } catch (err) {
    console.error("[scraper] Failed to parse cookies file:", err);
    return null;
  }
}

/**
 * Determine how many hours ago a Facebook relative timestamp string represents.
 * Facebook uses strings like "29m", "2h", "Just now", "Yesterday", or ISO dates.
 */
function parseRelativeTimestamp(raw: string): Date | null {
  const now = new Date();
  const lower = raw.toLowerCase().trim();

  if (lower === "just now") return now;

  const minuteMatch = lower.match(/^(\d+)\s*m(in(ute)?s?)?$/);
  if (minuteMatch) {
    const mins = parseInt(minuteMatch[1], 10);
    return new Date(now.getTime() - mins * 60 * 1000);
  }

  const hourMatch = lower.match(/^(\d+)\s*h(our)?s?$/);
  if (hourMatch) {
    const hrs = parseInt(hourMatch[1], 10);
    return new Date(now.getTime() - hrs * 60 * 60 * 1000);
  }

  if (lower.includes("yesterday")) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d;
  }

  // Attempt native date parsing for absolute timestamps
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Extract the Facebook post ID from a post's URL or aria-label.
 */
function extractPostId(url: string): string {
  // Matches /permalink/123456789/ or ?story_fbid=123456789
  const permalinkMatch = url.match(/\/permalink\/(\d+)/);
  if (permalinkMatch) return permalinkMatch[1];

  const storyMatch = url.match(/story_fbid=(\d+)/);
  if (storyMatch) return storyMatch[1];

  // Fallback: use the last numeric segment
  const numericMatch = url.match(/(\d{10,})/);
  return numericMatch ? numericMatch[1] : url;
}

/**
 * Scrape the CAR DEALERS GHANA Buy & Sell group for posts published
 * within the last `maxAgeHours` hours.
 */
export async function scrapeFacebookGroup(
  maxAgeHours = 48
): Promise<RawPost[]> {
  const cookies = loadSessionCookies();

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--window-size=1280,900",
      ],
    });

    context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 900 },
      locale: "en-US",
      timezoneId: "Africa/Accra",
    });

    // Inject session cookies to authenticate
    if (cookies && cookies.length > 0) {
      await context.addCookies(cookies as Parameters<typeof context.addCookies>[0]);
      console.log(`[scraper] Injected ${cookies.length} session cookies.`);
    }

    const page = await context.newPage();

    // Mask automation signals
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      (window as any).chrome = { runtime: {} };
    });

    console.log(`[scraper] Navigating to ${FB_GROUP_URL}`);
    await page.goto(FB_GROUP_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });

    // Dismiss any login/cookie consent dialogs
    await dismissOverlays(page);

    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    const posts: RawPost[] = [];
    let reachedCutoff = false;
    let scrollAttempts = 0;
    const maxScrollAttempts = 60;

    console.log(
      `[scraper] Collecting posts newer than ${cutoff.toISOString()} (${maxAgeHours}h window)`
    );

    while (!reachedCutoff && scrollAttempts < maxScrollAttempts) {
      const newPosts = await extractVisiblePosts(page, cutoff);

      for (const post of newPosts) {
        const postDate = new Date(post.postedAt);
        if (postDate < cutoff) {
          reachedCutoff = true;
          break;
        }
        // Deduplicate by postId
        if (!posts.find((p) => p.postId === post.postId)) {
          posts.push(post);
        }
      }

      if (reachedCutoff) break;

      // Scroll down to load more posts
      const prevHeight = await page.evaluate(() => document.body.scrollHeight);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2500 + Math.random() * 1000);

      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      if (newHeight === prevHeight) {
        console.log("[scraper] No more content to load.");
        break;
      }

      scrollAttempts++;
      console.log(
        `[scraper] Scroll ${scrollAttempts}/${maxScrollAttempts} — ${posts.length} posts collected so far`
      );
    }

    console.log(`[scraper] Finished. Total posts collected: ${posts.length}`);
    return posts;
  } finally {
    await context?.close();
    await browser?.close();
  }
}

/**
 * Dismiss login modals, cookie banners, and other overlays that block scraping.
 */
async function dismissOverlays(page: Page): Promise<void> {
  try {
    // Close the "Log in to continue" modal if present
    const closeBtn = page.locator('[aria-label="Close"]').first();
    if (await closeBtn.isVisible({ timeout: 3000 })) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  } catch {
    // No overlay found — continue
  }

  try {
    // Dismiss cookie consent
    const cookieBtn = page.locator('button:has-text("Allow all cookies")').first();
    if (await cookieBtn.isVisible({ timeout: 2000 })) {
      await cookieBtn.click();
      await page.waitForTimeout(500);
    }
  } catch {
    // No cookie banner — continue
  }
}

/**
 * Extract all post cards currently visible in the DOM.
 */
async function extractVisiblePosts(
  page: Page,
  cutoff: Date
): Promise<RawPost[]> {
  return page.evaluate(
    ({ cutoffIso }: { cutoffIso: string }) => {
      const cutoffDate = new Date(cutoffIso);
      const results: Array<{
        postId: string;
        sellerName: string;
        sellerProfileUrl: string;
        sellerProfilePicture: string | null;
        text: string;
        postedAt: string;
        imageUrls: string[];
        rawPrice: string | null;
        rawLocation: string | null;
      }> = [];

      // Facebook renders feed items as role="article" or data-pagelet containing posts
      const articles = document.querySelectorAll<HTMLElement>(
        '[role="article"]'
      );

      articles.forEach((article) => {
        try {
          // ── Timestamp ──────────────────────────────────────────────────────
          const timeEl = article.querySelector<HTMLElement>("abbr[data-utime]");
          let postedAt: string;

          if (timeEl?.dataset.utime) {
            postedAt = new Date(
              parseInt(timeEl.dataset.utime, 10) * 1000
            ).toISOString();
          } else {
            // Fallback: look for a link whose text looks like a relative time
            const timeLink = article.querySelector<HTMLAnchorElement>(
              'a[href*="/permalink/"], a[href*="story_fbid"]'
            );
            const rawTime = timeLink?.getAttribute("aria-label") ?? "";
            const parsed = new Date(rawTime);
            postedAt = isNaN(parsed.getTime())
              ? new Date().toISOString()
              : parsed.toISOString();
          }

          // Skip posts older than the cutoff
          if (new Date(postedAt) < cutoffDate) return;

          // ── Post ID ────────────────────────────────────────────────────────
          const postLink = article.querySelector<HTMLAnchorElement>(
            'a[href*="/permalink/"], a[href*="story_fbid"]'
          );
          const postHref = postLink?.href ?? "";
          const permalinkMatch = postHref.match(/\/permalink\/(\d+)/);
          const storyMatch = postHref.match(/story_fbid=(\d+)/);
          const numericMatch = postHref.match(/(\d{10,})/);
          const postId =
            permalinkMatch?.[1] ??
            storyMatch?.[1] ??
            numericMatch?.[1] ??
            Math.random().toString(36).slice(2);

          // ── Seller ─────────────────────────────────────────────────────────
          const sellerLink = article.querySelector<HTMLAnchorElement>(
            'a[href*="/user/"], a[href*="facebook.com/profile"],' +
              ' h2 a, h3 a, strong a'
          );
          const sellerName =
            sellerLink?.textContent?.trim() ?? "Unknown Seller";
          const sellerProfileUrl = sellerLink?.href ?? "";

          // Profile picture
          const avatarImg = article.querySelector<HTMLImageElement>(
            'image[xlink\\:href], img[data-imgperflogname="profileCoverPhoto"],' +
              ' a[href*="facebook.com"] img'
          );
          const sellerProfilePicture = avatarImg?.src ?? null;

          // ── Post Text ──────────────────────────────────────────────────────
          const textContainer = article.querySelector<HTMLElement>(
            '[data-ad-comet-preview="message"], [data-testid="post_message"],' +
              ' [dir="auto"]'
          );
          const text = textContainer?.innerText?.trim() ?? "";

          // ── Images ─────────────────────────────────────────────────────────
          const imgEls = article.querySelectorAll<HTMLImageElement>(
            'img[src*="scontent"], img[src*="fbcdn"]'
          );
          const imageUrls = Array.from(imgEls)
            .map((img) => img.src)
            .filter(
              (src) =>
                src &&
                !src.includes("emoji") &&
                !src.includes("static") &&
                src.length > 50
            );

          // ── Structured Buy & Sell fields ───────────────────────────────────
          // Facebook Buy & Sell posts expose price and location as structured spans
          const priceEl = article.querySelector<HTMLElement>(
            '[data-testid="marketplace_listing_price"],' +
              ' span[aria-label*="GHS"], span[aria-label*="price"]'
          );
          let rawPrice: string | null =
            priceEl?.textContent?.trim() ?? null;

          // Fallback: scan text for GHS pattern
          if (!rawPrice) {
            const priceMatch = text.match(/GHS[\s]?[\d,]+/i);
            if (priceMatch) rawPrice = priceMatch[0];
          }

          const locationEl = article.querySelector<HTMLElement>(
            '[data-testid="marketplace_listing_location"],' +
              ' span[aria-label*="location"]'
          );
          let rawLocation: string | null =
            locationEl?.textContent?.trim() ?? null;

          // Fallback: scan text for LOCATION keyword
          if (!rawLocation) {
            const locMatch = text.match(/LOCATION[:\s]+([A-Z\s,]+)/i);
            if (locMatch) rawLocation = locMatch[1].trim();
          }

          if (text || imageUrls.length > 0) {
            results.push({
              postId,
              sellerName,
              sellerProfileUrl,
              sellerProfilePicture,
              text,
              postedAt,
              imageUrls,
              rawPrice,
              rawLocation,
            });
          }
        } catch {
          // Skip malformed articles
        }
      });

      return results;
    },
    { cutoffIso: cutoff.toISOString() }
  );
}
