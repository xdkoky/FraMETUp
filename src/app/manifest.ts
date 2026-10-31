import type { MetadataRoute } from "next";

/** Lets students add FraMETUp to their home screen and open it full-screen like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FraMETUp",
    short_name: "FraMETUp",
    description: "Learn directing and cinematography, and map your growth as a film director.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    lang: "hu",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
