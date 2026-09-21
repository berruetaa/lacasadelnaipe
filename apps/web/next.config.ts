import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactCompiler: true,
  typedRoutes: true,
  transpilePackages: ["@lacasadelnaipe/catalog"],
};

export default nextConfig;
