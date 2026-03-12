# @workspace/fb-scraper

Facebook listing scraper for the VOOM car rental marketplace. Automatically collects car listings posted in the [CAR DEALERS GHANA](https://www.facebook.com/groups/cardealersghana/buy_sell_discussion) Buy & Sell group within the last 48 hours and creates reservable listings in the VOOM database.

## Architecture

```
Facebook Group (Buy & Sell)
        │
        ▼
 ┌─────────────────┐
 │  Playwright     │  Headless browser with session cookies
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
 │  DB Ingestion   │  Upserts host user → inserts car listing
 │  Pipeline       │  Idempotent: skips already-ingested posts
 └─────────────────┘
          │
          ▼
   VOOM PostgreSQL DB
   (cars + users tables)
```

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
cp artifacts/fb-scraper/.env.example artifacts/fb-scraper/.env
# Edit .env with your values
```

### 3. Provide Facebook session cookies

The scraper requires an authenticated Facebook session to access the group feed beyond the public preview.

1. Log in to [facebook.com](https://www.facebook.com) in Chrome.
2. Install the [Cookie-Editor](https://chrome.google.com/webstore/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm) extension.
3. Click the extension icon → **Export** → **Export as JSON**.
4. Save the file to the path specified in `FB_COOKIES_PATH` (default: `./fb_cookies.json`).

> **Security note:** Keep `fb_cookies.json` out of version control. It is already listed in `.gitignore`.

### 4. Run a manual scrape

```bash
# Scrape posts from the last 48 hours (default)
pnpm --filter @workspace/fb-scraper run scrape

# Scrape posts from the last 24 hours
pnpm --filter @workspace/fb-scraper run scrape -- --hours 24
```

### 5. Start the scraper service (with cron scheduler)

```bash
pnpm --filter @workspace/fb-scraper run dev
```

The service starts on `PORT` (default: 3001) and runs the scraper on the configured cron schedule.

## HTTP API

All endpoints require admin authentication via the main VOOM API server (`/api/scraper/*`).

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/scraper/trigger` | Trigger a scrape run (async) |
| `GET` | `/api/scraper/status` | Get current run status |
| `GET` | `/api/scraper/listings` | List recently scraped car IDs |

### Trigger a scrape run

```bash
curl -X POST http://localhost:3000/api/scraper/trigger \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-admin-session>" \
  -d '{"maxAgeHours": 48}'
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

Each ingested post embeds a `[fb_post_id:<id>]` marker in the car listing's description field. Before inserting a new listing, the pipeline checks for this marker to prevent duplicates across multiple scrape runs.

## Data Flow into VOOM

Each scraped post creates:
1. A **user** record (if the seller doesn't already have one) with `isHost: true`.
2. A **car** record linked to that host, with `available: true` and `status: "active"` — making it immediately bookable by VOOM users.
