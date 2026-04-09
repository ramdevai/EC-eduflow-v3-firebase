import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['firebase-admin', 'node-fetch', 'gaxios', 'google-auth-library'],
};

export default nextConfig;
