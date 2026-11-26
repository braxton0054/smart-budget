import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required by the Docker `runner` stage: ship the traced standalone server
  // instead of installing all dependencies in the runtime image.
  output: "standalone",
  experimental: {
    agentFeedback: true,
  },
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
