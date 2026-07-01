"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_ACCOUNTS, DEMO_DAILY_ANALYSIS_LIMIT } from "@/lib/demo-mode";

interface LoginFormProps {
  demoEnabled: boolean;
}

export function LoginForm({ demoEnabled }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn(loginEmail: string, loginPassword: string) {
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await signIn(email, password);
  }

  async function handleDemoLogin(demoEmail: string) {
    if (!demoEnabled) {
      setError(
        "Falta DEMO_USER_PASSWORD en el servidor (Vercel env o apps/web/.env.local).",
      );
      return;
    }

    setError(null);
    setLoading(true);
    setEmail(demoEmail);

    try {
      const res = await fetch("/api/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!res.ok) {
        setError(body.error ?? "Error al iniciar sesión demo");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Error de red al iniciar sesión demo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Demo pública · máx. {DEMO_DAILY_ANALYSIS_LIMIT} análisis IA/día por
          organización
        </p>
        <div className="grid gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.id}
              type="button"
              disabled={loading || !demoEnabled}
              onClick={() => void handleDemoLogin(account.email)}
              className="rounded-lg border border-border bg-background px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
            >
              {account.label}
            </button>
          ))}
        </div>
        {!demoEnabled && (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Configura DEMO_USER_PASSWORD en el servidor (no uses NEXT_PUBLIC_*)
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}
      </div>

      <details className="text-sm text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground">
          Iniciar sesión manualmente
        </summary>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          )}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-foreground bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-foreground bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Iniciar sesión"}
          </button>
        </form>
      </details>
    </div>
  );
}
