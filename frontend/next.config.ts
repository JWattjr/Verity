import type { NextConfig } from "next"

const apiProxyTarget = process.env.VERITY_API_PROXY_TARGET ?? "http://127.0.0.1:5080"

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
      {
        source: "/socket/:path*",
        destination: `${apiProxyTarget}/socket/:path*`,
      },
    ]
  },
}

export default nextConfig
