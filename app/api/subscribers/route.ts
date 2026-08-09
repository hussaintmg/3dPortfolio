import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import Subscriber from "@/models/Subscriber";
import Campaign from "@/models/Campaign";
import { verifyToken } from "@/lib/auth";

async function requireStaff() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  const s: any = await verifyToken(token);
  return s?.role === "owner" || s?.role === "admin" ? s : null;
}

/** GET — the list, plus the campaigns already sent to it. */
export async function GET() {
  try {
    const staff = await requireStaff();
    if (!staff) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }

    await dbConnect();
    const [subscribers, campaigns] = await Promise.all([
      Subscriber.find().sort({ createdAt: -1 }).limit(2000).lean(),
      Campaign.find().sort({ createdAt: -1 }).limit(30).lean(),
    ]);

    const active = (subscribers as any[]).filter(
      (s) => s.subscribed !== false,
    ).length;

    return NextResponse.json({
      success: true,
      subscribers,
      campaigns,
      stats: {
        total: subscribers.length,
        active,
        unsubscribed: subscribers.length - active,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/** DELETE — remove one address entirely (a hard delete, on request). */
export async function DELETE(req: Request) {
  try {
    const staff = await requireStaff();
    if (!staff) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }

    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing id" },
        { status: 400 },
      );
    }

    await dbConnect();
    await Subscriber.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Subscriber removed" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
