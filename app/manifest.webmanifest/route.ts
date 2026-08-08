import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import SiteSettings from "@/models/SiteSettings";
import { webData } from "@/constants/webData";

/**
 * Web app manifest, generated from the owner's site settings.
 *
 * Installing the site turns notifications into APP notifications: the OS then
 * shows this name and icon rather than the browser's.
 */
export async function GET() {
  let name = webData.websiteName;
  let description = webData.hero.subheading;

  try {
    await dbConnect();
    const s: any = await SiteSettings.findOne({ key: "global" }).lean();
    if (s?.websiteName) name = s.websiteName;
    if (s?.description) description = s.description;
  } catch {
    // fall back to the bundled defaults
  }

  const manifest = {
    name,
    short_name: name.length > 12 ? name.slice(0, 12) : name,
    description,
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0b0f19",
    theme_color: "#6366f1",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Dashboard", url: "/dashboard", description: "Overview and stats" },
      { name: "Chat", url: "/dashboard/chat", description: "Client messages" },
      { name: "Invoices", url: "/dashboard/invoices", description: "Billing" },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
