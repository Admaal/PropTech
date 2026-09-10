import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const rollback = await readFile(
  new URL("../supabase/rollback/00014-00016-rollback.sql", import.meta.url),
  "utf8",
);

assert.match(rollback, /BEGIN;/);
assert.match(rollback, /DROP FUNCTION IF EXISTS public\.create_pending_document/);
assert.match(rollback, /DROP INDEX IF EXISTS public\.idx_documents_org_idempotency/);
assert.match(rollback, /DROP COLUMN IF EXISTS attempt_count/);
assert.match(rollback, /DROP POLICY IF EXISTS properties_delete/);
assert.match(rollback, /COMMIT;/);

console.log("Migration rollback contract passed");
