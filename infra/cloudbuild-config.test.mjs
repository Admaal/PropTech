import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const configPath = new URL("../cloudbuild.yaml", import.meta.url);

let config;
try {
  config = await readFile(configPath, "utf8");
} catch {
  assert.fail("cloudbuild.yaml debe existir en la raíz del repositorio");
}

assert.match(config, /apps\/server\/Dockerfile/);
assert.match(config, /services\/mcp-ai\/Dockerfile/);
assert.match(config, /COMMIT_SHA/);
assert.match(config, /docker/);
assert.match(config, /push/);
assert.match(config, /proptech-server/);
assert.match(config, /proptech-mcp-ai/);
assert.match(config, /run/);
assert.match(config, /update/);
assert.doesNotMatch(
  config,
  /SUPABASE|GEMINI_API_KEY|SERVICE_ROLE_KEY|INTERNAL_SERVICE_KEY|BEGIN PRIVATE KEY/i,
);
assert.doesNotMatch(config, /terraform\s+(plan|apply)/i);

console.log("Cloud Build configuration contract passed");
