import type { MetadataRoute } from "next";

// Makes Trophy Case installable on a phone Home Screen.
//
// On iPhone: open the site in Safari, tap Share, then "Add to Home Screen".
// After that it launches full-screen with its own icon, no address bar.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trophy Case",
    short_name: "Trophy Case",
    description: "Snap a photo. Save the win. Build your timeline.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1020",
    theme_color: "#0b1020",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
