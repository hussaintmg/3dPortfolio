import { headers } from "next/headers";
import dbConnect from "@/lib/mongoose";
import Notification from "@/models/Notification";
import SiteSettings from "@/models/SiteSettings";
import { sendPush } from "@/lib/push";
import {
  resolveNotificationUrl,
  type Audience,
  type NotificationType,
} from "@/lib/notificationRoutes";

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

export type { NotificationType } from "@/lib/notificationRoutes";

interface NotifyInput {
  type: NotificationType;
  title: string;
  body?: string;
  /** Explicit destination; otherwise it is derived from type + audience. */
  link?: string;
  /** Deliver to specific users instead of all staff. */
  userIds?: string[];
  /** Conversation / invoice / enquiry id, used to build a deep link. */
  entityId?: string;
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
  const {
    type,
    title,
    body = "",
    link = "",
    userIds,
    entityId,
    tag,
    requireInteraction,
  } = input;

  const meta = { entityId, explicit: link || undefined };
  /** Where a click lands, per role. */
  const urlFor = (role: string) =>
    resolveNotificationUrl(type, (role as Audience) || "user", meta);

  // The stored record is read by staff in the bell menu
  const staffLink = resolveNotificationUrl(type, "owner", meta);

  let record: any = null;
  let icon: string | undefined;
  try {
    await dbConnect();
    record = await Notification.create({ type, title, body, link: staffLink });
    // The owner's uploaded app icon, so the notification carries our brand
    const s: any = await SiteSettings.findOne({ key: "global" })
      .select("appIconUrl")
      .lean();
    if (s?.appIconUrl) icon = s.appIconUrl;
  } catch {
    // an unwritable record shouldn't stop the live channels
  }

  const push = await sendPush(
    {
      title,
      body,
      icon,
      tag: tag || `${type}-${record?._id || Date.now()}`,
      requireInteraction,
    },
    userIds?.length ? { userIds, urlFor } : { staffOnly: true, urlFor },
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
          // Targeted delivery goes to clients; the broadcast goes to staff
          link: userIds?.length
            ? resolveNotificationUrl(type, "user", meta)
            : staffLink,
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
