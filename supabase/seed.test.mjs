import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// El seed debe poder ejecutarse más de una vez sin duplicar datos: cada INSERT es idempotente.
const seed = await readFile(new URL("./seed.sql", import.meta.url), "utf8");

// Quita comentarios de línea antes de partir en sentencias.
const sql = seed
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");
const statements = sql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => /^INSERT INTO/i.test(s));

assert.ok(statements.length >= 2, "el seed debe insertar organizaciones y propiedades");

for (const statement of statements) {
  const table = statement.match(/^INSERT INTO\s+(\w+)/i)?.[1];
  const idempotent =
    /ON CONFLICT/i.test(statement) || /WHERE NOT EXISTS/i.test(statement);
  assert.ok(
    idempotent,
    `el INSERT en ${table} no es idempotente: usa ON CONFLICT o WHERE NOT EXISTS`,
  );
}

// Las propiedades se comparan por organización, título y dirección (no hay IDs fijos en el seed).
const properties = statements.filter((s) => /^INSERT INTO\s+properties/i.test(s));
assert.equal(properties.length, 2, "una sentencia por organización");
for (const statement of properties) {
  assert.match(statement, /p\.organization_id\s*=\s*v\.organization_id/i);
  assert.match(statement, /p\.title\s*=\s*v\.title/i);
  assert.match(statement, /p\.address\s*=\s*v\.address/i);
}

console.log("Seed idempotente: contrato correcto");
