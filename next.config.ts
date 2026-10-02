import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully client-side MVP: export static HTML for Cloudflare Pages.
  output: "export",
};

export default nextConfig;
