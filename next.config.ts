import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.js": {
        condition: { query: "?url" },
        type: "asset",
      },
    },
  },
}

export default nextConfig
