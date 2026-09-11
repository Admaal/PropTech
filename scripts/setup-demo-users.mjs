/**
 * Crea usuarios demo vía Supabase Auth Admin API.
 * Ejecutar: node scripts/setup-demo-users.mjs
 * Requiere SUPABASE_SERVICE_ROLE_KEY y DEMO_USER_PASSWORD en .env (no commitear).
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
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const demoPassword = env.DEMO_USER_PASSWORD;

if (!url || !serviceRoleKey) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
  process.exit(1);
}

if (!demoPassword) {
  console.error("Falta DEMO_USER_PASSWORD en .env");
  process.exit(1);
}

const DEMO_USERS = [
  { email: "demo-a@test.com", org: "Inmobiliaria Centro" },
  { email: "demo-b@test.com", org: "Gestión Norte" },
  // Identidad negativa para tests RLS de member (sin org propia; se vincula
  // como role 'member' a una org existente en link-demo-users.sql).
  { email: "demo-member@test.com", org: null },
];

for (const user of DEMO_USERS) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
  };
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: user.email,
      password: demoPassword,
      email_confirm: true,
      user_metadata: user.org ? { organization_name: user.org } : {},
    }),
  });

  const body = await res.json();
  let userId = body.id ?? body.user?.id;

  if (!res.ok) {
    const msg = body.msg ?? body.message ?? JSON.stringify(body);
    if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
      console.log(`✓ ${user.email} ya existe`);
      const listRes = await fetch(
        `${url}/auth/v1/admin/users?email=${encodeURIComponent(user.email)}`,
        { headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey } },
      );
      const listBody = await listRes.json();
      userId = listBody.users?.[0]?.id;
    } else {
      console.error(`✗ ${user.email}:`, msg);
    }
  } else {
    console.log(`✓ Creado ${user.email} (${userId ?? "ok"})`);
  }

  if (!userId) continue;
}

console.log("\nUsuarios demo listos. Vincula user_id en supabase/scripts/link-demo-users.sql");
