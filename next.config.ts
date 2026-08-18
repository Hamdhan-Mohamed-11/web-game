import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js blocks cross-origin dev-server requests by default (DNS
  // rebinding protection) — without this, loading the app from a phone via
  // the LAN IP gets silent 403s on every asset/data request while
  // localhost keeps working fine. Update this if the host's LAN IP changes.
  allowedDevOrigins: ["192.168.1.78"],
};

export default nextConfig;
