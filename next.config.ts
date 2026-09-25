import type { NextConfig } from "next";

/**
 * ToolKitty ships as a fully static site: `next build` writes plain HTML, CSS,
 * JS and assets to `out/`. There is no server runtime, so there must never be
 * an API route, middleware, server action or per-request data fetch in this
 * repository (REQ-1).
 */
const nextConfig: NextConfig = {
  // Emit a static export to `out/` instead of a server build.
  output: "export",
  // No image optimisation server exists in a static export, so images are
  // served exactly as they are committed.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
