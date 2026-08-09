import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Subscriber from "@/models/Subscriber";

/**
 * Take someone off the list.
 *
 * Both verbs work on purpose: a person clicking the footer link arrives with
 * GET, while Gmail's and Outlook's native "Unsubscribe" button fires a POST
 * (RFC 8058 one-click). Supporting only one of them is how a list ends up
 * being reported as spam instead.
 */
async function unsubscribe(token: string | null) {
  if (!token) {
    return { ok: false, message: "This link is missing its code." };
  }

  await dbConnect();
  const sub: any = await Subscriber.findOne({ token });

  if (!sub) {
    // Say nothing about whether the address exists
    return {
      ok: false,
      message: "This link has expired or has already been used.",
    };
  }

  if (sub.subscribed === false) {
    return { ok: true, message: "You were already unsubscribed.", email: sub.email };
  }

  sub.subscribed = false;
  sub.unsubscribedAt = new Date();
  await sub.save();

  return { ok: true, message: "You've been unsubscribed.", email: sub.email };
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  const result = await unsubscribe(token);
  return NextResponse.json({ success: result.ok, ...result });
}

export async function POST(req: Request) {
  // One-click clients send an empty body; the token stays in the query string
  const token = new URL(req.url).searchParams.get("token");
  const result = await unsubscribe(token);
  return NextResponse.json({ success: result.ok, ...result });
}
