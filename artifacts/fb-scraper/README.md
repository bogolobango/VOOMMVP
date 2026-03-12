# @workspace/fb-scraper

Facebook listing scraper for the VOOM car rental marketplace. Automatically collects car listings posted in the [CAR DEALERS GHANA](https://www.facebook.com/groups/cardealersghana/buy_sell_discussion) Buy & Sell group within the last 48 hours and **publishes them directly as live, reservable listings** in the VOOM app — no manual intervention required.

## End-to-End Flow

```
Facebook Group (Buy & Sell)
        │
        ▼
 ┌─────────────────┐
 │  Playwright     │  Headless browser + session cookies
 │  Scraper        │  Extracts: seller, text, images, price, location
 └────────┬────────┘
          │ RawPost[]
          ▼
 ┌─────────────────┐
 │  OpenAI LLM     │  gpt-4o-mini parses unstructured text into:
 │  Parser         │  make, model, year, type, dailyRate, location…
 └────────┬────────┘
          │ ParsedCar
          ▼
 ┌─────────────────┐
 │  Image          │  Downloads Facebook CDN images to local storage
 │  Downloader     │  Returns persistent public URLs
 └────────┬────────┘
          │ string[]
          ▼
 ┌─────────────────┐
 │  Host Upsert    │  Finds or creates a VOOM host user for the seller
 │                 │  (isHost: true, role: "both")
 └────────┬────────┘
          │ User
          ▼
 ┌─────────────────┐
 │  Listing        │  Inserts directly into the `cars` table via the
 │  Publisher      │  shared @workspace/db storage layer
 │                 │  → available: true, status: "active"
 │                 │  → source: "facebook_scraper"
 │                 │  → fb_post_id stored for idempotency
 └─────────────────┘
          │
          ▼
   VOOM PostgreSQL DB
   Listing is LIVE and immediately bookable by VOOM users
```

## Why the Listing Publisher Bypasses the HTTP API

The publisher writes directly to the database via `@workspace/db` rather than calling `POST /api/cars`. This is intentional for three reasons:

1. **Rate limiter**: `POST /api/cars` is limited to 5 requests per minute. Bulk imports of 20–50 listings would be throttled.
2. **No session management**: The scraper does not need to log in as a VOOM user and maintain a session cookie.
3. **Schema consistency**: Both the api-server and fb-scraper share the same `@workspace/db` package, so any schema change is automatically reflected in both.

## Setup

### 1. Apply the database migration

Before running the scraper for the first time, add the three new columns to the `cars` table:

```bash
# Option A: use drizzle-kit push (recommended for Replit/dev)
pnpm --filter @workspace/db run push

# Option B: apply the SQL file manually
psql $DATABASE_URL -f lib/db/migrations/0001_add_fb_scraper_columns.sql
```

The migration adds:
- `fb_post_id TEXT UNIQUE` — idempotency key
- `fb_seller_profile_url TEXT` — seller provenance
- `source TEXT DEFAULT 'manual'` — distinguishes scraped vs. manual listings

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

```bash
cp artifacts/fb-scraper/.env.example artifacts/fb-scraper/.env
# Edit .env with your values
```

### 4. Provide Facebook session cookies

The scraper requires an authenticated Facebook session to access the group feed beyond the public preview.

1. Log in to [facebook.com](https://www.facebook.com) in Chrome.
2. Install the [Cookie-Editor](https://chrome.google.com/webstore/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm) extension.
3. Click the extension icon → **Export** → **Export as JSON**.
4. Save the file to the path specified in `FB_COOKIES_PATH` (default: `./fb_cookies.json`).

> **Security note:** Keep `fb_cookies.json` out of version control. It is already listed in `.gitignore`.

### 5. Run a manual scrape

```bash
# Scrape posts from the last 48 hours (default)
pnpm --filter @workspace/fb-scraper run scrape

# Scrape posts from the last 24 hours
pnpm --filter @workspace/fb-scraper run scrape -- --hours 24
```

### 6. Start the scraper service (with cron scheduler)

```bash
pnpm --filter @workspace/fb-scraper run dev
```

The service starts on `PORT` (default: 3001) and runs the scraper on the configured cron schedule (default: every 6 hours). Each run automatically publishes new listings to the VOOM app.

## HTTP API

All endpoints require admin authentication via the main VOOM API server (`/api/scraper/*`).

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/scraper/trigger` | Trigger a scrape run (async, returns 202) |
| `GET` | `/api/scraper/status` | Get current run status and last run stats |
| `GET` | `/api/scraper/listings` | List recently auto-published car listings |

### Trigger a scrape run

```bash
curl -X POST http://localhost:3000/api/scraper/trigger \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-admin-session>" \
  -d '{"maxAgeHours": 48}'
```

### Check run status

```bash
curl http://localhost:3000/api/scraper/status \
  -H "Cookie: connect.sid=<your-admin-session>"
```

Response:
```json
{
  "status": "completed",
  "startedAt": "2026-03-12T10:00:00.000Z",
  "completedAt": "2026-03-12T10:04:23.000Z",
  "durationSeconds": 263,
  "lastStats": {
    "total": 18,
    "created": 14,
    "skipped": 3,
    "errors": 1
  }
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `PORT` | Yes | — | HTTP port for the scraper service |
| `FB_COOKIES_PATH` | No | `./fb_cookies.json` | Path to Facebook session cookies |
| `SCRAPER_CRON_SCHEDULE` | No | `0 0 */6 * * *` | Cron schedule (every 6h) |
| `SCRAPER_API_KEY` | No | — | Secret key for the trigger endpoint |
| `IMAGES_DIR` | No | `./public/scraped-images` | Image storage directory |
| `PUBLIC_BASE_URL` | No | `http://localhost:3000` | Base URL for image serving |

## Idempotency

Each ingested post stores its Facebook post ID in the dedicated `fb_post_id` column (unique constraint). Before inserting a new listing, the pipeline queries this column. If a match is found, the post is skipped. This means re-running the scraper multiple times is completely safe — no duplicate listings will be created.

## Data Flow into VOOM

Each scraped post creates:
1. A **user** record (if the seller doesn't already have one) with `isHost: true` and `role: "both"`.
2. A **car** record linked to that host, with `available: true`, `status: "active"`, and `source: "facebook_scraper"` — making it immediately visible and bookable by VOOM users.
