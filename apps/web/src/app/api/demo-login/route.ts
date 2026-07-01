import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import { DEMO_ACCOUNTS } from "@/lib/demo-mode";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const DEMO_LOGIN_MAX_ATTEMPTS = 10;
const DEMO_LOGIN_WINDOW_MS = 15 * 60 * 1000;

const demoEmails = DEMO_ACCOUNTS.map((a) => a.email);

const DemoLoginSchema = z.object({
  email: z
    .string()
    .email()
    .refine((email) => demoEmails.includes(email as (typeof demoEmails)[number]), {
      message: "Cuenta demo no permitida",
    }),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limited = checkRateLimit(
    `demo-login:${ip}`,
    DEMO_LOGIN_MAX_ATTEMPTS,
    DEMO_LOGIN_WINDOW_MS,
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Inténtalo más tarde." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const demoPassword = process.env.DEMO_USER_PASSWORD;
  if (!demoPassword) {
    return NextResponse.json(
      { error: "Demo no configurada en el servidor" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = DemoLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Petición inválida" },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: demoPassword,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
