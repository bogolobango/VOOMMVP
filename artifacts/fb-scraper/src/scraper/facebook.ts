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
  process.env.FB_GROUP_URL ??
  "https://www.facebook.com/groups/cardealersghana/";

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
    const rawCookies = JSON.parse(raw) as Record<string, unknown>[];

    // Normalize browser-extension cookie format (e.g. EditThisCookie / Cookie-Editor)
    // to Playwright's expected format.
    const playwrightCookies = rawCookies.map((c) => {
      const sameSiteRaw = (c.sameSite as string | undefined) ?? "";
      const sameSiteMap: Record<string, "Strict" | "Lax" | "None"> = {
        strict: "Strict",
        lax: "Lax",
        none: "None",
        no_restriction: "None",
        unspecified: "Lax",
      };
      const sameSite: "Strict" | "Lax" | "None" =
        (["Strict", "Lax", "None"].includes(sameSiteRaw)
          ? (sameSiteRaw as "Strict" | "Lax" | "None")
          : sameSiteMap[sameSiteRaw.toLowerCase()] ?? "Lax");

      return {
        name: c.name as string,
        value: c.value as string,
        domain: c.domain as string,
        path: (c.path as string | undefined) ?? "/",
        // browser extensions use `expirationDate`; Playwright uses `expires`
        expires: (c.expires as number | undefined) ?? (c.expirationDate as number | undefined) ?? -1,
        httpOnly: (c.httpOnly as boolean | undefined) ?? false,
        secure: (c.secure as boolean | undefined) ?? false,
        sameSite,
      };
    });

    return playwrightCookies;
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
    // Use PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH if set, or fall back to bundled chromium
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
    browser = await chromium.launch({
      headless: true,
      executablePath,
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

    // Warm up the session: land on Facebook homepage first so the session
    // is established from this IP before we request a group page.
    console.log("[scraper] Warming session on facebook.com...");
    await page.goto("https://www.facebook.com/", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(3000 + Math.random() * 2000);

    // Check we're logged in on the homepage
    if (page.url().includes("login")) {
      console.warn("[scraper] Not logged in on homepage — cookies invalid. Re-export fresh cookies.");
      return [];
    }

    // Navigate to the Groups hub to further establish session context
    console.log("[scraper] Visiting /groups/ hub...");
    await page.goto("https://www.facebook.com/groups/", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(2000 + Math.random() * 1500);

    // Now navigate to the target group
    console.log(`[scraper] Navigating to ${FB_GROUP_URL}`);
    await page.goto(FB_GROUP_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });

    // Wait for Facebook's SPA to hydrate and render the feed
    await page.waitForTimeout(4000);

    // Dismiss any login/cookie consent dialogs
    await dismissOverlays(page);

    // Verify we landed on the group page, not a login/checkpoint page
    const currentUrl = page.url();
    if (
      currentUrl.includes("login") ||
      currentUrl.includes("checkpoint") ||
      currentUrl.includes("recover")
    ) {
      console.warn(
        `[scraper] Redirected to auth page: ${currentUrl}. ` +
          "Session cookies may have expired — re-export fresh cookies from your browser."
      );
      return [];
    }
    console.log(`[scraper] Confirmed on page: ${currentUrl}`);

    // Wait for the first article/post to appear in the feed (up to 15s)
    try {
      await page.waitForSelector('[role="article"]', { timeout: 15_000 });
      console.log("[scraper] Feed articles detected — starting extraction.");
    } catch {
      console.warn("[scraper] No articles visible after 15s. The group feed may be empty or require login.");
    }

    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    const posts: RawPost[] = [];
    let reachedCutoff = false;
    let scrollAttempts = 0;
    const maxScrollAttempts = 60;

    console.log(
      `[scraper] Collecting posts newer than ${cutoff.toISOString()} (${maxAgeHours}h window)`
    );

    while (!reachedCutoff && scrollAttempts < maxScrollAttempts) {
      // If Facebook navigated away mid-session, stop gracefully
      const pageUrl = page.url();
      if (pageUrl.includes("login") || pageUrl.includes("checkpoint")) {
        console.warn(`[scraper] Session interrupted — redirected to ${pageUrl}. Stopping.`);
        break;
      }

      let newPosts: RawPost[] = [];
      try {
        newPosts = await extractVisiblePosts(page, cutoff);
      } catch (extractErr) {
        console.warn("[scraper] Could not extract posts this scroll (page may have changed):", extractErr);
        break;
      }

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

      // Expand "See more" on any truncated posts before scrolling
      try {
        const seeMoreBtns = page.locator('div[role="button"]:has-text("See more"), span[role="button"]:has-text("See more")');
        const count = await seeMoreBtns.count();
        for (let i = 0; i < Math.min(count, 5); i++) {
          try { await seeMoreBtns.nth(i).click({ timeout: 1000 }); } catch { /* ok */ }
        }
      } catch { /* ok — no See more buttons */ }

      // Scroll down in a human-like fashion (two smaller steps)
      let prevHeight = 0;
      let newHeight = 0;
      try {
        prevHeight = await page.evaluate(() => document.body.scrollHeight);
        // Scroll half-way, pause, then scroll to bottom
        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5));
        await page.waitForTimeout(1500 + Math.random() * 800);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        // Longer human-like wait (4-7 seconds)
        await page.waitForTimeout(4000 + Math.random() * 3000);
        newHeight = await page.evaluate(() => document.body.scrollHeight);
      } catch (scrollErr) {
        console.warn("[scraper] Scroll interrupted (likely a page navigation):", scrollErr);
        break;
      }

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

      // Facebook renders feed items as role="article".
      // Comments are NESTED articles (inside another article), so we only
      // want top-level articles — those whose closest article ancestor is themselves.
      const allArticles = Array.from(
        document.querySelectorAll<HTMLElement>('[role="article"]')
      );
      const articles = allArticles.filter((el) => {
        // A top-level post has no parent article above it
        const parent = el.parentElement?.closest('[role="article"]');
        return !parent;
      });

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
          // Try progressively broader selectors to find the seller's name/link
          const sellerLink = article.querySelector<HTMLAnchorElement>(
            'a[href*="/user/"], a[href*="facebook.com/profile"],' +
              ' h2 a, h3 a, strong a,' +
              ' a[href*="facebook.com/"][role="link"]'
          );
          // If no linked name, try the first bold/header element in the article
          const sellerName =
            sellerLink?.textContent?.trim() ||
            article.querySelector<HTMLElement>("strong, h2, h3, b")?.textContent?.trim() ||
            "Unknown Seller";
          const sellerProfileUrl = sellerLink?.href ?? "";

          // Profile picture
          const avatarImg = article.querySelector<HTMLImageElement>(
            'image[xlink\\:href], img[data-imgperflogname="profileCoverPhoto"],' +
              ' a[href*="facebook.com"] img'
          );
          const sellerProfilePicture = avatarImg?.src ?? null;

          // ── Post Text ──────────────────────────────────────────────────────
          // Facebook's DOM evolves rapidly — try multiple selector strategies
          // in order of preference, falling back to full article text.
          let text = "";

          // Strategy 1: dedicated message/preview containers (older React builds)
          const msgEl = article.querySelector<HTMLElement>(
            '[data-ad-comet-preview="message"], [data-testid="post_message"]'
          );
          if (msgEl?.innerText?.trim()) {
            text = msgEl.innerText.trim();
          }

          // Strategy 2: first [dir="auto"] element with substantial text
          if (!text) {
            const dirEls = article.querySelectorAll<HTMLElement>('[dir="auto"]');
            for (const el of Array.from(dirEls)) {
              const t = el.innerText?.trim() ?? "";
              if (t.length > 30) { text = t; break; }
            }
          }

          // Strategy 3: collect all text from the article, skip known noise nodes
          if (!text) {
            const skipTags = new Set(["BUTTON", "A", "TIME", "ABBR", "SVG", "IMG"]);
            const skipTexts = ["See more", "See less", "Like", "Comment", "Share", "Reply", "Most relevant"];
            const chunks: string[] = [];
            article.querySelectorAll<HTMLElement>("span, p").forEach((el) => {
              const raw = el.innerText?.trim() ?? "";
              if (raw.length < 5) return;
              if (skipTags.has(el.tagName)) return;
              if (skipTexts.some((s) => raw.includes(s))) return;
              // Skip if it's a descendant of a button/link
              if (el.closest("button, a")) return;
              chunks.push(raw);
            });
            // De-duplicate and join
            const seen = new Set<string>();
            text = chunks.filter((c) => { if (seen.has(c)) return false; seen.add(c); return true; }).join("\n");
          }

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
