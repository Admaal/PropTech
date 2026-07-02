"use client";

import type { ApiWarmupPhase } from "@/hooks/use-api-warmup";

interface DemoWarmupBannerProps {
  phase: ApiWarmupPhase;
  onRetry: () => void;
}

export function DemoWarmupBanner({ phase, onRetry }: DemoWarmupBannerProps) {
  if (phase === "ready") {
    return null;
  }

  if (phase === "offline") {
    return (
      <div
        className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        role="status"
      >
        <p className="font-medium">La demo no está disponible en este momento</p>
        <p className="mt-1 text-muted-foreground">
          Inténtalo de nuevo en unos minutos.
        </p>
        <button
          type="button"
          onClick={() => void onRetry()}
          className="mt-3 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          Reintentar conexión
        </button>
      </div>
    );
  }

  return (
    <div
      className="mb-6 rounded-lg border border-border bg-card px-4 py-3 text-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
        <div>
          <p className="font-medium">Iniciando servidor de la demo…</p>
          <p className="mt-1 text-muted-foreground">
            Suele tardar unos 15 segundos la primera vez.
          </p>
        </div>
      </div>
    </div>
  );
}
