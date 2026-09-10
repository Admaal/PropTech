import { describe, expect, it } from "vitest";
import { isSecureInternalServiceKey } from "./security.js";

describe("isSecureInternalServiceKey", () => {
  it("accepts a sufficiently long non-placeholder key", () => {
    expect(isSecureInternalServiceKey("a".repeat(32))).toBe(true);
  });

  it("rejects missing, weak, and placeholder keys", () => {
    expect(isSecureInternalServiceKey(undefined)).toBe(false);
    expect(isSecureInternalServiceKey("dev-internal-key")).toBe(false);
    expect(isSecureInternalServiceKey("replace-with-a-random-local-key")).toBe(
      false,
    );
    expect(isSecureInternalServiceKey("short")).toBe(false);
  });
});
