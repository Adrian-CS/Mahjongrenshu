import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "何切る · Nanikiru Trainer",
    short_name: "Nanikiru",
    description: "Entrenador de eficiencia de tiles (何切る) para riichi mahjong.",
    lang: "es",
    start_url: "/",
    scope: "/",
    // Installed app opens sideways and full screen: 14 tiles need the width.
    display: "fullscreen",
    display_override: ["fullscreen", "standalone"],
    orientation: "landscape",
    background_color: "#065f46",
    theme_color: "#065f46",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // The art keeps the tile inside the maskable safe zone, so it doubles as maskable.
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
