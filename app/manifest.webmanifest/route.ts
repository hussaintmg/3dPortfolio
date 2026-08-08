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
  let custom = "";
  let themeColor = "#0083fe";
  let backgroundColor = "#0b0f19";

  try {
    await dbConnect();
    const s: any = await SiteSettings.findOne({ key: "global" }).lean();
    if (s?.websiteName) name = s.websiteName;
    if (s?.description) description = s.description;
    if (s?.appIconUrl) custom = s.appIconUrl;
    if (s?.themeColor) themeColor = s.themeColor;
    if (s?.backgroundColor) backgroundColor = s.backgroundColor;
  } catch {
    // fall back to the bundled defaults
  }

  /**
   * An uploaded icon is already square (the uploader crops it), so the same
   * file can serve every size — the OS scales it down. Without one we fall
   * back to the icons shipped in /public.
   */
  const icons = custom
    ? [
        { src: custom, sizes: "192x192", type: "image/png", purpose: "any" as const },
        { src: custom, sizes: "512x512", type: "image/png", purpose: "any" as const },
        { src: custom, sizes: "512x512", type: "image/png", purpose: "maskable" as const },
      ]
    : [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" as const },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" as const },
        {
          src: "/icons/icon-maskable-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable" as const,
        },
      ];

  const manifest = {
    name,
    short_name: name.length > 12 ? name.slice(0, 12) : name,
    description,
    id: "/",
    // Clients who install from the public site should land on the site, not
    // on a dashboard they have no access to.
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: backgroundColor,
    theme_color: themeColor,
    categories: ["business", "productivity"],
    icons,
    shortcuts: [
      { name: "Projects", url: "/projects", description: "Recent work" },
      { name: "Packages", url: "/packages", description: "Pricing" },
      { name: "Contact", url: "/contact", description: "Start a project" },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
