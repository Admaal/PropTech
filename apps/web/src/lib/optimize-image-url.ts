const UNSPLASH_HOSTNAME = "images.unsplash.com";

export function isUnsplashImageUrl(source: string): boolean {
  try {
    const url = new URL(source);
    return url.protocol === "https:" && url.hostname === UNSPLASH_HOSTNAME;
  } catch {
    return false;
  }
}

export function optimizeImageUrl(
  source: string,
  width: number,
  quality = 75,
): string {
  if (!isUnsplashImageUrl(source)) {
    return source;
  }

  try {
    const url = new URL(source);
    url.searchParams.set("auto", "format");
    url.searchParams.set("fm", "webp");
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality));

    return url.toString();
  } catch {
    return source;
  }
}
