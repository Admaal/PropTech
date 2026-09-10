const PLACEHOLDER_KEYS = new Set([
  "dev-internal-key",
  "replace-with-a-random-local-key",
]);

export function isSecureInternalServiceKey(
  value: unknown,
): value is string {
  return (
    typeof value === "string" &&
    value.length >= 32 &&
    !PLACEHOLDER_KEYS.has(value)
  );
}
