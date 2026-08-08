import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import PushSubscription from "@/models/PushSubscription";
import { verifyToken } from "@/lib/auth";
import { sendPush } from "@/lib/push";

async function currentUser() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  return (await verifyToken(token)) as any;
}

/** GET — the public VAPID key plus this user's device count. */
export async function GET() {
  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
    const user = await currentUser();

    let devices = 0;
    if (user) {
      await dbConnect();
      devices = await PushSubscription.countDocuments({ userId: user.id });
    }

    return NextResponse.json({
      success: true,
      configured: !!publicKey,
      publicKey,
      devices,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** POST — register (or refresh) this browser's push subscription. */
export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ success: false, message: "Sign in first" }, { status: 401 });

    await dbConnect();
    const { subscription, userAgent } = await req.json();

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { success: false, message: "Invalid subscription" },
        { status: 400 },
      );
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        $set: {
          userId: user.id,
          role: user.role,
          keys: subscription.keys,
          userAgent: (userAgent || "").slice(0, 300),
          failedAt: null,
        },
      },
      { upsert: true },
    );

    return NextResponse.json({
      success: true,
      message: "This device will now receive notifications",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** DELETE ?endpoint= — unregister this browser. */
export async function DELETE(req: Request) {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint");

    // Scoped to the caller so nobody can unsubscribe someone else
    await PushSubscription.deleteOne(
      endpoint ? { endpoint, userId: user.id } : { userId: user.id },
    );

    return NextResponse.json({ success: true, message: "Device removed" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** PUT — send a test push to the caller's own devices. */
export async function PUT() {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const result = await sendPush(
      {
        title: "Test notification",
        body: "If you can see this with your own logo, push is working.",
        url: user.role === "user" ? "/portal" : "/dashboard",
        tag: "test",
      },
      { userIds: [user.id] },
    );

    return NextResponse.json({
      success: true,
      ...result,
      message: result.sent
        ? `Sent to ${result.sent} device(s)`
        : "No registered devices — enable notifications first",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
