import { NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongoose";
import Subscriber from "@/models/Subscriber";
import { guardRate } from "@/lib/rateLimit";
import { raiseNotification } from "@/lib/notifications";
import { sendSubscribeWelcome } from "@/lib/email";
import { SITE_URL } from "@/lib/seo";

export async function POST(req: Request) {
  try {
    // Spam protection: 3 subscriptions/hour per IP
    const limited = guardRate(req, "subscribe", 3, 60 * 60_000);
    if (limited) return limited;

    await dbConnect();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 },
      );
    }

    const address = String(email).toLowerCase().trim();
    const existing: any = await Subscriber.findOne({ email: address });

    if (existing) {
      /**
       * Someone who unsubscribed and comes back is asking to be re-added, so
       * honour it. Any known address used to be a silent no-op, which meant
       * there was no route back onto the list at all.
       */
      if (existing.subscribed === false) {
        existing.subscribed = true;
        existing.unsubscribedAt = null;
        if (!existing.token) {
          existing.token = crypto.randomBytes(24).toString("hex");
        }
        await existing.save();

        sendWelcome(existing.email, existing.token);
        return NextResponse.json({
          success: true,
          message: "Welcome back — resubscribed",
          resubscribed: true,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Already subscribed",
        existed: true,
      });
    }

    const created: any = await Subscriber.create({ email: address });

    // Confirming the signup is what makes it feel like it actually worked
    sendWelcome(created.email, created.token);

    // In-app dashboard notification (non-blocking)
    try {
      await raiseNotification({
        type: "subscriber",
        title: "New newsletter subscriber",
        body: address,
        link: "/dashboard/subscribers",
      });
    } catch {}

    return NextResponse.json({ success: true, message: "Successfully subscribed" });
  } catch (error: any) {
    console.error("Subscription Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * Fire-and-forget: a mail server having a bad minute must not turn a
 * successful signup into an error the visitor sees.
 */
function sendWelcome(email: string, token: string) {
  void sendSubscribeWelcome({
    to: email,
    unsubscribeUrl: `${SITE_URL}/unsubscribe?token=${encodeURIComponent(token)}`,
    siteUrl: SITE_URL,
  }).catch((err) => console.error("Welcome email failed:", err?.message));
}
