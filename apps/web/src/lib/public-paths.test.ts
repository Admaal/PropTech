import { describe, expect, it } from "vitest";
import { isPublicPath } from "./public-paths";

describe("isPublicPath", () => {
  it("permite los endpoints SEO sin autenticación", () => {
    expect(isPublicPath("/robots.txt")).toBe(true);
    expect(isPublicPath("/sitemap.xml")).toBe(true);
  });

  it("mantiene protegidas las rutas de la aplicación", () => {
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/admin")).toBe(false);
    expect(isPublicPath("/api/properties")).toBe(false);
  });
});
