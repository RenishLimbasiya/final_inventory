import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // distDir: ".next-vercel-output",
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
