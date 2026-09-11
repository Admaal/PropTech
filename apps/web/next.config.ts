import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@proptech/shared"],
  output: process.env.VERCEL ? undefined : "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
