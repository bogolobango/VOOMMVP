-- Migration: 0001_add_fb_scraper_columns
-- Adds three columns to the `cars` table to support the Facebook scraper
-- auto-publishing pipeline.
--
-- Run this migration against your database before deploying the fb-scraper
-- service. With drizzle-kit push, this is applied automatically via:
--
--   pnpm --filter @workspace/db run push
--
-- Or apply manually:
--   psql $DATABASE_URL -f lib/db/migrations/0001_add_fb_scraper_columns.sql

-- fb_post_id: stores the originating Facebook post ID.
-- The UNIQUE constraint enforces idempotency — attempting to insert a
-- duplicate post ID will raise a conflict, which the pipeline catches.
ALTER TABLE cars
  ADD COLUMN IF NOT EXISTS fb_post_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS fb_seller_profile_url TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

-- Index for fast lookups by source (used in GET /scraper/listings)
CREATE INDEX IF NOT EXISTS idx_cars_source ON cars (source);

-- Index for fast idempotency checks by fb_post_id
CREATE INDEX IF NOT EXISTS idx_cars_fb_post_id ON cars (fb_post_id);
