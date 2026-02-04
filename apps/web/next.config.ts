import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ["@subcare/types", "@subcare/utils", "@subcare/database"],
  async rewrites() {
    const apiInternalUrl = process.env.API_INTERNAL_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${apiInternalUrl}/api/:path*`,
      },
      {
        source: '/socket.io',
        destination: `${apiInternalUrl}/socket.io/`,
      },
      {
        source: '/socket.io/:path+',
        destination: `${apiInternalUrl}/socket.io/:path+`,
      },
    ];
  },
};

export default nextConfig;