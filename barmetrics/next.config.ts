import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      {
        source: '/scan',
        destination: '/weigh',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
