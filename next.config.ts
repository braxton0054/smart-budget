import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Self-hosted production runs from .next/standalone/server.js.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
