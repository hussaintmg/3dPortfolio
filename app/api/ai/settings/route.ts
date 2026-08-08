import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import AiSettings from "@/models/AiSettings";
import { verifyToken } from "@/lib/auth";

async function session() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  return (await verifyToken(token)) as any;
}

const isStaff = (s: any) => s?.role === "owner" || s?.role === "admin";

export async function GET() {
  try {
    const user = await session();
    if (!isStaff(user)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }
    await dbConnect();
    const doc =
      (await AiSettings.findOne({ key: "global" }).lean()) ||
      (await AiSettings.create({ key: "global" })).toObject();

    return NextResponse.json({ success: true, settings: doc });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const user = await session();
    if (user?.role !== "owner") {
      return NextResponse.json(
        { success: false, message: "Only the owner can change AI settings" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const allowed = [
      "enabled",
      "chatAutoReply",
      "awayAfterMinutes",
      "minGapSeconds",
      "maxRepliesPerThread",
      "translationEnabled",
      "defaultTranslateTarget",
    ] as const;

    const update: Record<string, unknown> = {};
    for (const field of allowed) {
      if (body[field] === undefined) continue;
      if (field === "awayAfterMinutes") {
        // Zero would mean the assistant talks over a live human
        update[field] = Math.min(120, Math.max(1, Number(body[field]) || 3));
      } else if (field === "minGapSeconds") {
        update[field] = Math.min(600, Math.max(5, Number(body[field]) || 20));
      } else if (field === "maxRepliesPerThread") {
        update[field] = Math.min(50, Math.max(1, Number(body[field]) || 6));
      } else {
        update[field] = body[field];
      }
    }

    await dbConnect();
    const doc = await AiSettings.findOneAndUpdate(
      { key: "global" },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return NextResponse.json({ success: true, settings: doc });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/** POST — staff heartbeat: "someone is watching the chat right now". */
export async function POST() {
  try {
    const user = await session();
    if (!isStaff(user)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }
    await dbConnect();
    await AiSettings.findOneAndUpdate(
      { key: "global" },
      { $set: { staffLastSeenAt: new Date() } },
      { upsert: true, setDefaultsOnInsert: true },
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
