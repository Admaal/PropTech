const LOCAL_SITE_URL = "http://localhost:3000";

function withProtocol(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function getSiteUrl(): URL {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();

  if (!configuredUrl) {
    return new URL(LOCAL_SITE_URL);
  }

  try {
    return new URL(withProtocol(configuredUrl));
  } catch {
    return new URL(LOCAL_SITE_URL);
  }
}
