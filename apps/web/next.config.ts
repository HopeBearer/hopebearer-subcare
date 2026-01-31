import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ["@subcare/types", "@subcare/utils"],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
      {
        source: '/socket.io',
        destination: 'http://localhost:3001/socket.io/',
      },
      {
        source: '/socket.io/:path+',
        destination: 'http://localhost:3001/socket.io/:path+',
      },
    ];
  },
};

export default nextConfig;
