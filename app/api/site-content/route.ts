import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import SiteContent from "@/models/SiteContent";
import { verifyToken } from "@/lib/auth";

/** GET /api/site-content → { content: { key: value, ... } } */
export async function GET() {
  try {
    await dbConnect();
    const docs = await SiteContent.find().lean();
    const content: Record<string, string> = {};
    for (const doc of docs as any[]) content[doc.key] = doc.value;
    return NextResponse.json({ success: true, content });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/** PUT /api/site-content  body: { updates: { key: value, ... } } — owner only */
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
        { success: false, message: "Only the owner can edit site content" },
        { status: 403 },
      );
    }

    const { updates } = await req.json();
    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, message: "No updates provided" },
        { status: 400 },
      );
    }

    const ops = Object.entries(updates)
      .filter(([k, v]) => typeof k === "string" && typeof v === "string")
      .map(([key, value]) => ({
        updateOne: {
          filter: { key },
          update: { $set: { value } },
          upsert: true,
        },
      }));

    if (ops.length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid updates provided" },
        { status: 400 },
      );
    }

    await SiteContent.bulkWrite(ops);
    return NextResponse.json({
      success: true,
      message: `${ops.length} text block(s) saved`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
