import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the dev "N" badge; it overlaps the phone and dashboard on the stage view.
  devIndicators: false,
  // PGlite loads its WASM and data files from its package folder at runtime, so don't bundle it.
  serverExternalPackages: ["@electric-sql/pglite", "@electric-sql/pglite-socket"],
};

export default nextConfig;
