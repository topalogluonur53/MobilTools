import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['mobil.onurtopaloglu.uk'],
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8001/api/:path*',
      },
      {
        source: '/media/:path*',
        destination: 'http://127.0.0.1:8001/media/:path*',
      },
    ]
  },
};

export default nextConfig;
