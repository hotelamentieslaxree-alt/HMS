import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "21.0.21.112",
    ".space-z.ai",
  ],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "framer-motion",
      "@prisma/client",
      "recharts",
      "@tanstack/react-table",
      "cmdk",
    ],
  },
  turbopack: {},
};

export default nextConfig;
