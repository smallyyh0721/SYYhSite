import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  agentRules: false,
  experimental: { cpus: 1 },
  ...(process.env.NODE_ENV === "development" ? {
    rewrites: async () => [{ source: "/api/:path*", destination: `${process.env.CONTENT_API_URL || "http://127.0.0.1:3001"}/api/:path*` }],
  } : {}),
};
export default config;
