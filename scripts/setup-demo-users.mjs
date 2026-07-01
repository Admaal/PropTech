/**
 * Crea usuarios demo vía Supabase Auth REST API.
 * Ejecutar: node scripts/setup-demo-users.mjs
 * Requiere DEMO_USER_PASSWORD en .env (no commitear).
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.SUPABASE_URL;
const anonKey = env.SUPABASE_ANON_KEY;
const demoPassword = env.DEMO_USER_PASSWORD;

if (!url || !anonKey) {
  console.error("Faltan SUPABASE_URL o SUPABASE_ANON_KEY en .env");
  process.exit(1);
}

if (!demoPassword) {
  console.error("Falta DEMO_USER_PASSWORD en .env");
  process.exit(1);
}

const DEMO_USERS = [
  { email: "demo-a@test.com", org: "Inmobiliaria Centro" },
  { email: "demo-b@test.com", org: "Gestión Norte" },
];

for (const user of DEMO_USERS) {
  const res = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
    },
    body: JSON.stringify({
      email: user.email,
      password: demoPassword,
      data: { organization_name: user.org },
    }),
  });

  const body = await res.json();

  if (!res.ok) {
    const msg = body.msg ?? body.message ?? JSON.stringify(body);
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
      console.log(`✓ ${user.email} ya existe`);
    } else {
      console.error(`✗ ${user.email}:`, msg);
    }
  } else {
    console.log(`✓ Creado ${user.email} (${body.id ?? body.user?.id ?? "ok"})`);
  }
}

console.log("\nUsuarios demo listos. Vincula user_id en supabase/scripts/link-demo-users.sql");
