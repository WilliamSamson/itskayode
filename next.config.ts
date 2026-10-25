import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  ...(process.env.NODE_ENV === "development"
    ? { allowedDevOrigins: ["10.10.4.103"] }
    : { output: "export" as const }),
  outputFileTracingRoot: path.resolve(__dirname),
  trailingSlash: true,
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"]
  }
};

export default nextConfig;
