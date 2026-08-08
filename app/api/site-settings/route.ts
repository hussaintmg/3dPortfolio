import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import SiteSettings from "@/models/SiteSettings";
import { verifyToken } from "@/lib/auth";
import { deleteFileFromSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    await dbConnect();
    const settings = await SiteSettings.findOne({ key: "global" }).lean();
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const user: any = await verifyToken(token);
    if (!user || user.role !== "owner") {
      return NextResponse.json(
        { success: false, message: "Only the owner can update site settings" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const {
      websiteName,
      title,
      description,
      faviconUrl,
      faviconStorageKey,
      email,
      phone,
      address,
      socials,
      footerLinks,
      maintenanceMode,
      maintenanceMessage,
    } = body;

    // Clean up the previous favicon file when it is being replaced
    const existing = await SiteSettings.findOne({ key: "global" });
    if (
      existing?.faviconStorageKey &&
      faviconStorageKey &&
      existing.faviconStorageKey !== faviconStorageKey
    ) {
      await deleteFileFromSupabase(existing.faviconStorageKey);
    }

    const settings = await SiteSettings.findOneAndUpdate(
      { key: "global" },
      {
        $set: {
          ...(websiteName !== undefined && { websiteName }),
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(faviconUrl !== undefined && { faviconUrl }),
          ...(faviconStorageKey !== undefined && { faviconStorageKey }),
          ...(email !== undefined && { email }),
          ...(phone !== undefined && { phone }),
          ...(address !== undefined && { address }),
          ...(socials !== undefined && { socials }),
          ...(footerLinks !== undefined && { footerLinks }),
          ...(maintenanceMode !== undefined && {
            maintenanceMode: !!maintenanceMode,
          }),
          ...(maintenanceMessage !== undefined && { maintenanceMessage }),
        },
      },
      { new: true, upsert: true },
    );

    return NextResponse.json({
      success: true,
      settings,
      message: "Settings updated",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
