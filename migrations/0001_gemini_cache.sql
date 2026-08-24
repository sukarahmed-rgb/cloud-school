-- Migration: 0001_gemini_cache.sql
-- Description: Create gemini_cache table for storing AI prompt-response pairs.
-- Consolidated from worker/migrations/ (which CI never applied — wrangler only
-- reads the root migrations/ directory). IF NOT EXISTS keeps it idempotent.

CREATE TABLE IF NOT EXISTS gemini_cache (
  prompt_hash TEXT PRIMARY KEY,
  prompt TEXT,
  response TEXT,
  created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_gemini_cache_created_at ON gemini_cache(created_at);
