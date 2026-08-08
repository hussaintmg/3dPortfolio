import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Subscriber from "@/models/Subscriber";
import { guardRate } from "@/lib/rateLimit";
import { raiseNotification } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    // Spam protection: 3 subscriptions/hour per IP
    const limited = guardRate(req, "subscribe", 3, 60 * 60_000);
    if (limited) return limited;

    await dbConnect();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, message: "Email is required" }, { status: 400 });
    }

    // Check if subscriber exists
    const existing = await Subscriber.findOne({ email: email.toLowerCase() });
    if (existing) {
      // Per user request: if already saved, no reaction (or return success but do nothing)
      // I'll return a special status or message that the frontend can use to show "already subscribed" toast.
      return NextResponse.json({ success: true, message: "Already subscribed", existed: true });
    }

    await Subscriber.create({ email });

    // In-app dashboard notification (non-blocking)
    try {
      await raiseNotification({
        type: "subscriber",
        title: "New newsletter subscriber",
        body: email,
        link: "/dashboard",
      });
    } catch {}

    return NextResponse.json({ success: true, message: "Successfully subscribed" });
  } catch (error: any) {
    console.error("Subscription Error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
