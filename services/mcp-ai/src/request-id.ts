import { randomUUID } from "node:crypto";

// Mismo formato que acepta apps/server (middleware/request-id.ts).
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

export function newRequestId(): string {
  return randomUUID();
}

// El ID llega del server; si no cumple el patrón, no se usa en logs.
export function resolveRequestId(supplied: string | undefined): string {
  return supplied && REQUEST_ID_PATTERN.test(supplied) ? supplied : newRequestId();
}
