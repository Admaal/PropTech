"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pingApiHealth } from "@/lib/api-health";

interface ApiRetryPanelProps {
  message?: string;
}

export function ApiRetryPanel({
  message = "Conectando con el servidor de la demo…",
}: ApiRetryPanelProps) {
  const router = useRouter();
  const [attempting, setAttempting] = useState(true);
  const [offline, setOffline] = useState(false);

  const retry = useCallback(async () => {
    setAttempting(true);
    setOffline(false);
    const result = await pingApiHealth({ maxAttempts: 3 });
    if (result.status === "ok") {
      router.refresh();
      return;
    }
    setOffline(true);
    setAttempting(false);
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void retry();
    }, 0);
    return () => clearTimeout(timer);
  }, [retry]);

  return (
    <div className="rounded-lg border border-border bg-card p-6 text-sm">
      <div className="flex items-start gap-3">
        {attempting && (
          <span
            className="mt-0.5 inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent"
            aria-hidden
          />
        )}
        <div className="space-y-2">
          <p className="font-medium">
            {offline
              ? "No pudimos cargar los datos de la demo"
              : message}
          </p>
          <p className="text-muted-foreground">
            {offline
              ? "El servidor puede estar despertando. Reintenta en unos segundos."
              : "Esto es normal tras unos minutos sin uso."}
          </p>
          {offline && (
            <button
              type="button"
              onClick={() => void retry()}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
