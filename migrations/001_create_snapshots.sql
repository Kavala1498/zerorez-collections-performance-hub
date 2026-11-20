-- Shared dashboard snapshots (processed Excel uploads).
-- Applied automatically on first API request when DATABASE_URL is set.

CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cutoff_date TEXT NOT NULL,
  stage_mode TEXT NOT NULL,
  filename TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS snapshots_created_at_idx
  ON snapshots (created_at DESC);
