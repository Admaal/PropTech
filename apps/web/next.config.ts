import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@proptech/shared"],
  output: "standalone",
  images: {
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
