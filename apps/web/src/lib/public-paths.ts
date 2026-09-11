const PUBLIC_PATHS = [
  "/",
  "/login",
  "/robots.txt",
  "/sitemap.xml",
] as const;

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/api/demo-login" || pathname.startsWith("/api/demo-login/")) {
    return true;
  }

  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
