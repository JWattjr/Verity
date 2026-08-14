import type { NextConfig } from "next"

const apiProxyTarget =
  process.env.VERITY_API_PROXY_TARGET ?? "http://127.0.0.1:5080"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "polymarket-upload.s3.us-east-2.amazonaws.com",
      },
    ],
  },
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
