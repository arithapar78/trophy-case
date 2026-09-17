import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets you open the app on your phone while developing.
  //
  // In development Next.js only trusts "localhost" by default and blocks
  // everything else, which means a phone loads the page but never receives
  // the JavaScript — so nothing you tap does anything.
  //
  // These patterns cover the private address ranges a home router or an
  // iPhone hotspot hands out, so this keeps working when the address
  // changes. Each "*" stands for one part of the address.
  //
  // Development only: `next build` ignores this, so it widens nothing on a
  // real deployment. These addresses are only reachable from your own
  // network in any case.
  allowedDevOrigins: [
    "192.168.*.*", // typical home Wi-Fi
    "172.20.10.*", // iPhone Personal Hotspot
    "10.*.*.*", // some home and school networks
  ],
};

export default nextConfig;
