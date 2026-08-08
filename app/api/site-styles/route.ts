import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import SiteStyle from "@/models/SiteStyle";
import { verifyToken } from "@/lib/auth";

/** Only these CSS properties can be set from the on-page panel. */
const ALLOWED = new Set([
  "color",
  "backgroundColor",
  "backgroundImage",
  "borderWidth",
  "borderStyle",
  "borderColor",
  "borderRadius",
  "textAlign",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "letterSpacing",
  "lineHeight",
  "textTransform",
  "textDecoration",
  "padding",
  "margin",
  "opacity",
  "boxShadow",
  "display",
  "justifyContent",
  "alignItems",
  "gap",
  "width",
  "maxWidth",
  "height",
]);

/** Strip anything unexpected so a stored style can never inject CSS tricks. */
function sanitize(styles: any): Record<string, string> {
  const out: Record<string, string> = {};
  if (!styles || typeof styles !== "object") return out;
  for (const [prop, value] of Object.entries(styles)) {
    if (!ALLOWED.has(prop)) continue;
    if (typeof value !== "string" && typeof value !== "number") continue;
    const v = String(value).slice(0, 200);
    // Block url()/expression()/javascript: payloads outright
    if (/url\(|expression\(|javascript:|@import/i.test(v)) continue;
    if (v.trim() === "") continue;
    out[prop] = v;
  }
  return out;
}

/** GET → { styles: { key: {prop: value} } } */
export async function GET() {
  try {
    await dbConnect();
    const docs = await SiteStyle.find().lean();
    const styles: Record<string, any> = {};
    for (const d of docs as any[]) styles[d.key] = d.styles || {};
    return NextResponse.json({ success: true, styles });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/** PUT body: { updates: { key: {prop: value} | null } } — owner only. */
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
        { success: false, message: "Only the owner can change styles" },
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

    const ops = Object.entries(updates).map(([key, value]) => {
      const clean = sanitize(value);
      // Empty object = "reset this element" → delete the record
      if (Object.keys(clean).length === 0) {
        return { deleteOne: { filter: { key } } };
      }
      return {
        updateOne: {
          filter: { key },
          update: { $set: { styles: clean } },
          upsert: true,
        },
      };
    });

    if (ops.length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid updates" },
        { status: 400 },
      );
    }

    await SiteStyle.bulkWrite(ops as any);
    return NextResponse.json({
      success: true,
      message: `${ops.length} style rule(s) saved`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
