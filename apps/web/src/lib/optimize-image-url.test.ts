import { describe, expect, it } from "vitest";
import { optimizeImageUrl } from "./optimize-image-url";

describe("optimizeImageUrl", () => {
  it("optimiza Unsplash con formato, ancho y calidad", () => {
    const result = optimizeImageUrl(
      "https://images.unsplash.com/photo-123?w=900&q=80",
      400,
    );
    const url = new URL(result);

    expect(url.searchParams.get("auto")).toBe("format");
    expect(url.searchParams.get("fm")).toBe("webp");
    expect(url.searchParams.get("w")).toBe("400");
    expect(url.searchParams.get("q")).toBe("75");
  });

  it("conserva parámetros ajenos y reemplaza los de tamaño y calidad", () => {
    const result = optimizeImageUrl(
      "https://images.unsplash.com/photo-123?ixlib=abc&w=900&q=80",
      900,
      80,
    );
    const url = new URL(result);

    expect(url.searchParams.get("ixlib")).toBe("abc");
    expect(url.searchParams.get("w")).toBe("900");
    expect(url.searchParams.get("q")).toBe("80");
  });

  it("deja intactos los orígenes que no son Unsplash", () => {
    const source = "https://cdn.example.com/property.jpg?width=900";

    expect(optimizeImageUrl(source, 400)).toBe(source);
  });

  it("deja intacto un origen Unsplash que no usa HTTPS", () => {
    const source = "http://images.unsplash.com/photo-123?w=900";

    expect(optimizeImageUrl(source, 400)).toBe(source);
  });
});
