import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import SiteSettings from "@/models/SiteSettings";

/**
 * Tiny public endpoint the middleware calls on every navigation to decide
 * whether maintenance mode is on. Deliberately returns nothing sensitive.
 */
export async function GET() {
  try {
    await dbConnect();
    const s: any = await SiteSettings.findOne({ key: "global" })
      .select("maintenanceMode maintenanceMessage")
      .lean();
    return NextResponse.json(
      {
        success: true,
        maintenanceMode: !!s?.maintenanceMode,
        maintenanceMessage: s?.maintenanceMessage || "",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // Never lock the site out because of a DB hiccup
    return NextResponse.json({ success: true, maintenanceMode: false });
  }
}
