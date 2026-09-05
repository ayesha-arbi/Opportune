import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep config minimal for now. AI keys stay in server env vars and are
  // never inlined into the client bundle, so no public env config is needed.
};

export default nextConfig;
