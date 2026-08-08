import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import Notification from "@/models/Notification";
import { verifyToken } from "@/lib/auth";

async function requireStaff() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  const user: any = await verifyToken(token);
  if (!user || (user.role !== "admin" && user.role !== "owner")) return null;
  return user;
}

/** GET → latest 30 notifications + unread count (admin/owner only). */
export async function GET() {
  try {
    const user = await requireStaff();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const [notifications, unread] = await Promise.all([
      Notification.find().sort({ createdAt: -1 }).limit(30).lean(),
      Notification.countDocuments({ read: false }),
    ]);
    return NextResponse.json({ success: true, notifications, unread });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/** PUT body: { ids?: string[] } — marks given (or ALL) notifications read. */
export async function PUT(req: Request) {
  try {
    const user = await requireStaff();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const { ids } = await req.json().catch(() => ({}) as any);
    const filter =
      Array.isArray(ids) && ids.length > 0
        ? { _id: { $in: ids } }
        : { read: false };
    await Notification.updateMany(filter, { $set: { read: true } });
    return NextResponse.json({ success: true, message: "Marked as read" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
