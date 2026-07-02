import { fetchWithRetry } from "@/lib/fetch-with-retry";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type ApiHealthResult =
  | { status: "ok" }
  | { status: "offline"; lastError: string };

export interface PingApiHealthOptions {
  maxAttempts?: number;
  timeoutMs?: number;
  backoffMs?: number[];
}

export async function pingApiHealth(
  options: PingApiHealthOptions = {},
): Promise<ApiHealthResult> {
  const {
    maxAttempts = 5,
    timeoutMs = 8_000,
    backoffMs = [2_000, 4_000, 6_000, 8_000, 10_000],
  } = options;

  let lastError = "No se pudo conectar con el servidor";

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetchWithRetry(`${API_URL}/health`, {
        maxAttempts: 1,
        timeoutMs,
        cache: "no-store",
      });

      if (res.ok) {
        return { status: "ok" };
      }

      lastError = `El servidor respondió con error (${res.status})`;
    } catch (e) {
      lastError =
        e instanceof Error ? e.message : "No se pudo conectar con el servidor";
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, backoffMs[attempt] ?? backoffMs.at(-1) ?? 2_000),
      );
    }
  }

  return { status: "offline", lastError };
}
