import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bill ORC — Receipt Tracker",
    short_name: "Bill ORC",
    description:
      "Store and organize your receipts with automatic OCR extraction",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#0f766e",
    icons: [],
  };
}
