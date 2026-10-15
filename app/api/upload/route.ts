import { NextRequest, NextResponse } from "next/server";
import { uploadFileToBlob } from "@/lib/blob";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { guardRate } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    // Storage-abuse protection: 30 uploads/hour per IP (admins only anyway)
    const limited = guardRate(request, "upload", 30, 60 * 60_000);
    if (limited) return limited;

    // Authenticate the user - only allow admins and owners to upload files
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const user: any = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }
    const isStaff = user.role === "admin" || user.role === "owner";

    const formData = await request.formData();
    const file = formData.get("file") as File;
    let folder = (formData.get("folder") as string) || "uploads";

    // Regular users may only upload CHAT attachments, capped at 15MB
    if (!isStaff) {
      folder = "chat";
      if (file && file.size > 15 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: "File too large (max 15MB)" },
          { status: 400 },
        );
      }
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    const uploadRes = await uploadFileToBlob(file, folder);
    if (!uploadRes.success) {
      return NextResponse.json(
        { success: false, error: uploadRes.error },
        { status: 500 }
      );
    }

    return NextResponse.json(uploadRes);
  } catch (error: any) {
    console.error("API Upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
