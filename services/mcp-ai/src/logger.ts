// Logger JSON mínimo para Cloud Run. Solo escribe campos de una lista cerrada:
// nunca nombres de fichero, contenido de PDF ni claves.
export interface LogFields {
  service?: string;
  requestId?: string;
  analysisId?: string;
  model?: string;
  attempt?: number;
  status?: number;
}

type LogLevel = "info" | "warn" | "error";

const SEVERITY: Record<LogLevel, string> = {
  info: "INFO",
  warn: "WARNING",
  error: "ERROR",
};

const ALLOWED_FIELDS = [
  "service",
  "requestId",
  "analysisId",
  "model",
  "attempt",
  "status",
] as const;

export function logEvent(
  level: LogLevel,
  msg: string,
  fields: LogFields = {},
): void {
  const line: Record<string, unknown> = {
    severity: SEVERITY[level],
    level,
    msg,
    time: new Date().toISOString(),
  };
  for (const key of ALLOWED_FIELDS) {
    if (fields[key] !== undefined) line[key] = fields[key];
  }
  console.log(JSON.stringify(line));
}
