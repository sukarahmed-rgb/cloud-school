-- Migration: 0001_gemini_cache.sql
-- Description: Create gemini_cache table for storing AI prompt-response pairs

CREATE TABLE IF NOT EXISTS gemini_cache (
  prompt_hash TEXT PRIMARY KEY,
  prompt TEXT,
  response TEXT,
  created_at TEXT
);
