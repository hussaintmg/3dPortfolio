import { headers } from "next/headers";
import dbConnect from "@/lib/mongoose";
import Notification from "@/models/Notification";
import { sendPush } from "@/lib/push";

/**
 * The origin this request actually arrived on. Using the live host (rather
 * than a build-time env var) keeps the internal socket call correct on any
 * port or domain — dev, preview or production.
 */
async function selfOrigin() {
  try {
    const h = await headers();
    const host = h.get("host");
    if (host) {
      const proto =
        h.get("x-forwarded-proto") ||
        (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // not in a request scope (cron, script) — fall through
  }
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    "http://localhost:3000"
  );
}

export type NotificationType =
  | "enquiry"
  | "subscriber"
  | "chat"
  | "payment"
  | "system";

interface NotifyInput {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  /** Deliver to specific users instead of all staff. */
  userIds?: string[];
  /** Groups replacements: a second message from the same thread replaces it. */
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * Single entry point for raising a notification.
 *
 * Writes the in-app record, fires a Web Push to registered devices, and
 * (best effort) relays it over socket.io so any open tab updates instantly.
 * Failures in the delivery channels never break the caller.
 */
export async function raiseNotification(input: NotifyInput) {
  const { type, title, body = "", link = "", userIds, tag, requireInteraction } = input;

  let record: any = null;
  try {
    await dbConnect();
    record = await Notification.create({ type, title, body, link });
  } catch {
    // an unwritable record shouldn't stop the live channels
  }

  const push = await sendPush(
    {
      title,
      body,
      url: link || "/dashboard",
      tag: tag || `${type}-${record?._id || Date.now()}`,
      requireInteraction,
    },
    userIds?.length ? { userIds } : { staffOnly: true },
  ).catch(() => ({ sent: 0 }));

  // Realtime nudge for tabs that are already open
  try {
    const base = await selfOrigin();
    await fetch(`${base}/api/realtime-emit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room: userIds?.length ? userIds : "staff",
        event: "notification:new",
        payload: {
          _id: String(record?._id || ""),
          type,
          title,
          body,
          link,
          read: false,
          createdAt: new Date().toISOString(),
        },
      }),
      cache: "no-store",
    });
  } catch {
    // socket relay is a nicety, not a requirement
  }

  return { record, pushed: push.sent };
}
