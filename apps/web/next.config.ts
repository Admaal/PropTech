import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@proptech/shared"],
  output: "standalone",
};

export default nextConfig;
