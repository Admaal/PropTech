import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(
  new URL("../supabase/migrations/00015_upload_idempotency.sql", import.meta.url),
  "utf8",
);

assert.match(migration, /ADD COLUMN IF NOT EXISTS idempotency_key TEXT/);
assert.match(
  migration,
  /CREATE UNIQUE INDEX[^;]*organization_id[^;]*idempotency_key/,
);
assert.match(
  migration,
  /CREATE OR REPLACE FUNCTION public\.create_pending_document/,
);
assert.match(migration, /pg_advisory_xact_lock/);
assert.match(migration, /QUOTA_EXCEEDED/);
assert.match(migration, /IDEMPOTENCY_KEY_CONFLICT/);
assert.match(migration, /effective_daily_limit/);
assert.match(migration, /public\.platform_admins/);
assert.match(migration, /LEAST\(p_daily_limit,\s*3\)/);
assert.doesNotMatch(migration, /SECURITY DEFINER/);
assert.match(
  migration,
  /GRANT EXECUTE ON FUNCTION public\.create_pending_document/,
);

console.log("Upload idempotency contract passed");
