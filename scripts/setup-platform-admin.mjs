/**
 * Crea usuario platform admin vía Supabase Auth REST API.
 * Ejecutar: node scripts/setup-platform-admin.mjs
 * Requiere PLATFORM_ADMIN_PASSWORD en .env (no commitear).
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
const password = env.PLATFORM_ADMIN_PASSWORD;

if (!url || !serviceRoleKey) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
  process.exit(1);
}

if (!password) {
  console.error("Falta PLATFORM_ADMIN_PASSWORD en .env");
  process.exit(1);
}

const email = env.PLATFORM_ADMIN_EMAIL ?? "admin@test.com";

const signupRes = await fetch(`${url}/auth/v1/admin/users`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
  },
  body: JSON.stringify({
    email,
    password,
    email_confirm: true,
    user_metadata: { organization_name: "Platform Admin" },
  }),
});

const signupBody = await signupRes.json();

let userId = signupBody.id ?? signupBody.user?.id;

if (!signupRes.ok) {
  const msg = (signupBody.msg ?? signupBody.message ?? JSON.stringify(signupBody)).toLowerCase();
  if (!msg.includes("already") && !msg.includes("registered") && !msg.includes("exists")) {
    console.error("Error creando admin:", signupBody);
    process.exit(1);
  }
  const listRes = await fetch(`${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
  });
  const listBody = await listRes.json();
  userId = listBody.users?.[0]?.id;
  console.log(`✓ ${email} ya existe`);
}

if (!userId) {
  console.error("No se pudo obtener user_id del admin");
  process.exit(1);
}

const insertRes = await fetch(`${url}/rest/v1/platform_admins`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
    Prefer: "resolution=ignore-duplicates",
  },
  body: JSON.stringify({ user_id: userId }),
});

if (!insertRes.ok && insertRes.status !== 409) {
  const err = await insertRes.text();
  console.error("Error en platform_admins:", err);
  process.exit(1);
}

console.log(`✓ Platform admin listo: ${email}`);
console.log("  Acceso cross-org en /admin");
