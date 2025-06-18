import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: [
    "pdf-parse",
    "mammoth",
    "node-pptx-parser",
    "msgreader",
  ],
};

export default nextConfig;
