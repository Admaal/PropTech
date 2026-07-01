/** Límite mostrado en UI; el enforcement real está en DAILY_ANALYSIS_QUOTA del server. */
export const DEMO_DAILY_ANALYSIS_LIMIT = 3;

export const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "";

export const DEMO_ACCOUNTS = [
  {
    id: "demo-a",
    label: "Demo A — Inmobiliaria Centro",
    email: "demo-a@test.com",
  },
  {
    id: "demo-b",
    label: "Demo B — Gestión Norte",
    email: "demo-b@test.com",
  },
] as const;

export const isDemoLoginConfigured = DEMO_PASSWORD.length > 0;
