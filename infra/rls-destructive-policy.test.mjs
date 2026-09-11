import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(
  new URL("../supabase/migrations/00014_admin_destructive_rls.sql", import.meta.url),
  "utf8",
);

assert.match(
  migration,
  /CREATE OR REPLACE FUNCTION private\.user_is_org_admin/,
);
assert.match(migration, /DROP POLICY IF EXISTS properties_update/);
assert.match(migration, /DROP POLICY IF EXISTS properties_delete/);
assert.match(migration, /DROP POLICY IF EXISTS candidates_all/);
assert.match(migration, /DROP POLICY IF EXISTS documents_delete/);
assert.match(migration, /DROP POLICY IF EXISTS analyses_delete/);
assert.match(migration, /DROP POLICY IF EXISTS documents_storage_delete/);
assert.match(
  migration,
  /CREATE POLICY documents_storage_insert[\s\S]*EXISTS[\s\S]*public\.properties/,
);
assert.match(
  migration,
  /CREATE POLICY properties_delete[\s\S]*private\.user_is_org_admin/,
);
assert.match(
  migration,
  /CREATE POLICY candidates_delete[\s\S]*private\.user_is_org_admin/,
);
assert.match(
  migration,
  /CREATE POLICY documents_delete[\s\S]*private\.user_is_org_admin/,
);
assert.match(
  migration,
  /CREATE POLICY analyses_delete[\s\S]*private\.user_is_org_admin/,
);
assert.match(
  migration,
  /CREATE POLICY documents_storage_delete[\s\S]*private\.user_is_org_admin/,
);

console.log("Destructive RLS policy contract passed");
