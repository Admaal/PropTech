import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

const compose = await readFile(new URL("../docker-compose.yml", import.meta.url), "utf8");
const envExample = await readFile(new URL("../.env.example", import.meta.url), "utf8");

function serviceBlock(name, nextName) {
  const start = compose.indexOf(`  ${name}:`);
  const end = compose.indexOf(`  ${nextName}:`, start);
  assert.notEqual(start, -1, `docker-compose.yml debe definir ${name}`);
  assert.notEqual(end, -1, `docker-compose.yml debe definir ${nextName}`);
  return compose.slice(start, end);
}

test("server no recibe el entorno completo ni secretos exclusivos de mcp-ai", () => {
  const server = serviceBlock("server", "mcp-ai");

  assert.doesNotMatch(server, /env_file:\s*-\s*\.env/);
  assert.doesNotMatch(server, /SUPABASE_SERVICE_ROLE_KEY|GEMINI_API_KEY/);
});

test("mcp-ai recibe solo sus secretos y no publica el puerto en toda la red", () => {
  const mcpAi = serviceBlock("mcp-ai", "web");

  assert.match(mcpAi, /127\.0\.0\.1:3002:3002/);
  assert.match(mcpAi, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(mcpAi, /GEMINI_API_KEY/);
});

test("el ejemplo no contiene la clave interna débil conocida", () => {
  const weakKey = ["INTERNAL_SERVICE_KEY", "=dev-internal-key"].join("");
  assert.doesNotMatch(envExample, new RegExp(weakKey));
});
