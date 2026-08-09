import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSignedUpload, resolveContentType } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import { guardRate } from "@/lib/rateLimit";
import {
  BUCKET_MAX_BYTES,
  uploadSizeError,
  formatBytes,
  safeObjectName,
} from "@/lib/uploadLimits";

/**
 * Authorises a browser-direct upload.
 *
 * Nothing but JSON crosses this route — the file itself never touches a
 * serverless function, which is the entire point. See the note on
 * `createSignedUpload` for why.
 */
export async function POST(request: NextRequest) {
  try {
    const limited = guardRate(request, "upload", 60, 60 * 60_000);
    if (limited) return limited;

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Please sign in to send files." },
        { status: 401 },
      );
    }

    const user: any = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Your session has expired. Sign in again." },
        { status: 403 },
      );
    }

    const isStaff = user.role === "admin" || user.role === "owner";

    const body = await request.json().catch(() => null);
    if (!body?.name) {
      return NextResponse.json(
        { success: false, error: "No file described" },
        { status: 400 },
      );
    }

    const name = String(body.name);
    const size = Number(body.size) || 0;
    const declaredType = body.type ? String(body.type) : "";

    // Clients may only ever write into chat/, same rule as /api/upload
    const folder = isStaff ? String(body.folder || "uploads") : "chat";

    // Per-kind caps first (they carry the friendlier wording), then the hard
    // bucket ceiling that Supabase would reject anyway.
    const kindError = uploadSizeError(size, declaredType);
    if (kindError) {
      return NextResponse.json({ success: false, error: kindError }, { status: 413 });
    }
    if (size > BUCKET_MAX_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `Storage accepts files up to ${formatBytes(BUCKET_MAX_BYTES)}; this one is ${formatBytes(size)}.`,
        },
        { status: 413 },
      );
    }

    const objectName = safeObjectName(name);
    const signed = await createSignedUpload(folder, objectName);

    if (!signed.success) {
      return NextResponse.json(
        { success: false, error: signed.error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      filePath: signed.filePath,
      fileName: signed.fileName,
      signedUrl: signed.signedUrl,
      token: signed.token,
      publicUrl: signed.publicUrl,
      contentType: resolveContentType(objectName, declaredType),
    });
  } catch (error: any) {
    console.error("Signed upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Could not prepare the upload" },
      { status: 500 },
    );
  }
}
