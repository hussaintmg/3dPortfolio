import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import SiteAnimation from "@/models/SiteAnimation";
import { verifyToken } from "@/lib/auth";
import { ANIMATION_PRESETS, EASINGS } from "@/lib/animations";

const VALID_TYPES = new Set(ANIMATION_PRESETS.map((p) => p.id));
const VALID_EASINGS = new Set(EASINGS.map((e) => e.id));

/** GET → { animations: { key: {type, duration, delay, easing, once} } } */
export async function GET() {
  try {
    await dbConnect();
    const docs = await SiteAnimation.find().lean();
    const animations: Record<string, any> = {};
    for (const d of docs as any[]) {
      animations[d.key] = {
        type: d.type,
        duration: d.duration,
        delay: d.delay,
        easing: d.easing,
        once: d.once !== false,
      };
    }
    return NextResponse.json({ success: true, animations });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/** PUT body: { updates: { key: config | null } } — owner only. */
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
        { success: false, message: "Only the owner can change animations" },
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

    const ops = Object.entries(updates as Record<string, any>).map(
      ([key, v]) => {
        // "none" or a cleared value removes the animation entirely
        if (!v || !v.type || v.type === "none") {
          return { deleteOne: { filter: { key } } };
        }
        return {
          updateOne: {
            filter: { key },
            update: {
              $set: {
                type: VALID_TYPES.has(v.type) ? v.type : "fade-up",
                duration: Math.min(5000, Math.max(100, Number(v.duration) || 700)),
                delay: Math.min(5000, Math.max(0, Number(v.delay) || 0)),
                easing: VALID_EASINGS.has(v.easing) ? v.easing : "smooth",
                once: v.once !== false,
              },
            },
            upsert: true,
          },
        };
      },
    );

    if (ops.length === 0)
      return NextResponse.json(
        { success: false, message: "No valid updates" },
        { status: 400 },
      );

    await SiteAnimation.bulkWrite(ops as any);
    return NextResponse.json({
      success: true,
      message: `${ops.length} animation(s) saved`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
