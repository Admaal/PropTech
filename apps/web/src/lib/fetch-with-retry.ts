const RETRYABLE_STATUS = new Set([502, 503, 504]);

export interface FetchWithRetryOptions extends RequestInit {
  maxAttempts?: number;
  timeoutMs?: number;
  backoffMs?: number[];
}

function isRetryableResponse(status: number): boolean {
  return RETRYABLE_STATUS.has(status);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const {
    maxAttempts = 3,
    timeoutMs = 12_000,
    backoffMs = [1_000, 2_000, 3_000],
    ...init
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(input, {
        ...init,
        signal: controller.signal,
      });

      if (res.ok || !isRetryableResponse(res.status)) {
        return res;
      }

      lastError = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastError = e;
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < maxAttempts - 1) {
      await sleep(backoffMs[attempt] ?? backoffMs.at(-1) ?? 2_000);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No se pudo conectar con el servidor");
}
