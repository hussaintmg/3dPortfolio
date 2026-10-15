import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createClientUploadToken,
  resolveContentType,
  getBlobToken,
} from "@/lib/blob";
import { verifyToken } from "@/lib/auth";
import { guardRate } from "@/lib/rateLimit";
import {
  BUCKET_MAX_BYTES,
  uploadSizeError,
  formatBytes,
  safeObjectName,
} from "@/lib/uploadLimits";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

/**
 * Authorises a browser-direct upload to Vercel Blob.
 *
 * Nothing but JSON crosses this route — the file bytes travel directly
 * from the browser to Vercel Blob storage, bypassing serverless body limits.
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

    // If request comes from @vercel/blob/client's standard handleUpload
    if (body?.type === "blob.generate-client-token") {
      const blobToken = await getBlobToken();
      const jsonResponse = await handleUpload({
        body: body as HandleUploadBody,
        request,
        token: blobToken,
        onBeforeGenerateToken: async () => {
          return {
            maximumSizeInBytes: BUCKET_MAX_BYTES,
            tokenPayload: JSON.stringify({ userId: user.id, role: user.role }),
          };
        },
        onUploadCompleted: async () => {},
      });
      return NextResponse.json(jsonResponse);
    }

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

    // Per-kind caps first, then store ceiling
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
    const pathname = `${folder}/${objectName}`;
    const contentType = resolveContentType(objectName, declaredType);

    const signed = await createClientUploadToken(pathname, BUCKET_MAX_BYTES);

    if (!signed.success) {
      return NextResponse.json(
        { success: false, error: signed.error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      clientToken: signed.clientToken,
      pathname,
      fileName: objectName,
      contentType,
    });
  } catch (error: any) {
    console.error("Signed upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Could not prepare the upload" },
      { status: 500 },
    );
  }
}
