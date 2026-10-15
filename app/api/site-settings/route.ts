import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import SiteSettings from "@/models/SiteSettings";
import { verifyToken } from "@/lib/auth";
import { deleteBlob } from "@/lib/blob";

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

/**
 * Search consoles show you a whole `<meta …>` tag and people paste the whole
 * thing. Only the `content` value belongs in the field, so pull it out rather
 * than storing a tag inside a tag and failing verification for no good reason.
 */
function normaliseVerification(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const fromTag = raw.match(/content\s*=\s*["']([^"']+)["']/i);
  if (fromTag) return fromTag[1].trim();
  // "google-site-verification: googleXXXX.html" is the file-method contents
  const prefixed = raw.match(/^google-site-verification:\s*(\S+)$/i);
  if (prefixed) return prefixed[1].trim();
  return raw.replace(/^["']|["']$/g, "");
}

/** The file method wants a bare `googleXXXX.html`, however it was pasted. */
function normaliseVerificationFile(value: unknown): string {
  const raw = normaliseVerification(value);
  if (!raw) return "";
  const name = raw.split("/").pop() || "";
  return /^google[A-Za-z0-9_-]+\.html$/.test(name) ? name : "";
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
      appIconUrl,
      appIconStorageKey,
      themeColor,
      backgroundColor,
      email,
      phone,
      address,
      socials,
      footerLinks,
      maintenanceMode,
      maintenanceMessage,
      googleVerification,
      googleVerificationFile,
      bingVerification,
    } = body;

    // Clean up the previous favicon file when it is being replaced
    const existing = await SiteSettings.findOne({ key: "global" });
    if (
      existing?.faviconStorageKey &&
      faviconStorageKey &&
      existing.faviconStorageKey !== faviconStorageKey
    ) {
      await deleteBlob(existing.faviconStorageKey);
    }
    if (
      existing?.appIconStorageKey &&
      appIconStorageKey &&
      existing.appIconStorageKey !== appIconStorageKey
    ) {
      await deleteBlob(existing.appIconStorageKey);
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
          ...(appIconUrl !== undefined && { appIconUrl }),
          ...(appIconStorageKey !== undefined && { appIconStorageKey }),
          ...(themeColor !== undefined && { themeColor }),
          ...(backgroundColor !== undefined && { backgroundColor }),
          ...(email !== undefined && { email }),
          ...(phone !== undefined && { phone }),
          ...(address !== undefined && { address }),
          ...(socials !== undefined && { socials }),
          ...(footerLinks !== undefined && { footerLinks }),
          ...(maintenanceMode !== undefined && {
            maintenanceMode: !!maintenanceMode,
          }),
          ...(maintenanceMessage !== undefined && { maintenanceMessage }),
          ...(googleVerification !== undefined && {
            googleVerification: normaliseVerification(googleVerification),
          }),
          ...(googleVerificationFile !== undefined && {
            googleVerificationFile: normaliseVerificationFile(googleVerificationFile),
          }),
          ...(bingVerification !== undefined && {
            bingVerification: normaliseVerification(bingVerification),
          }),
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
