import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(
  new URL("../supabase/migrations/00016_ai_job_recovery.sql", import.meta.url),
  "utf8",
);

assert.match(migration, /ADD COLUMN IF NOT EXISTS attempt_count INTEGER/);
assert.match(migration, /ADD COLUMN IF NOT EXISTS lease_until TIMESTAMPTZ/);
assert.match(migration, /ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.claim_analysis_job/);
assert.match(migration, /status = 'processing'/);
assert.match(migration, /lease_until < now\(\)/);
assert.match(migration, /attempt_count < 3/);
assert.match(migration, /RETURNING/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.renew_analysis_job/);
assert.match(migration, /lease_until > now\(\)/);

console.log("AI job recovery contract passed");
