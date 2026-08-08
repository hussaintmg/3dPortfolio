import webpush from "web-push";
import dbConnect from "@/lib/mongoose";
import PushSubscription from "@/models/PushSubscription";

let configured = false;

/** VAPID identifies this server to the push services. */
function configure() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    publicKey,
    privateKey,
  );
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  icon?: string;
  image?: string;
  requireInteraction?: boolean;
}

/**
 * Sends a push to specific users, or to every staff device when no ids are
 * given. Dead endpoints are pruned as we go.
 */
export async function sendPush(
  payload: PushPayload,
  opts: { userIds?: string[]; staffOnly?: boolean } = {},
) {
  if (!configure()) {
    return { sent: 0, skipped: "VAPID keys are not configured" };
  }

  await dbConnect();

  const filter: any = { failedAt: null };
  if (opts.userIds?.length) filter.userId = { $in: opts.userIds };
  else if (opts.staffOnly) filter.role = { $in: ["owner", "admin"] };

  const subs: any[] = await PushSubscription.find(filter).lean();
  if (subs.length === 0) return { sent: 0 };

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body || "",
    url: payload.url || "/dashboard",
    tag: payload.tag,
    icon: payload.icon,
    image: payload.image,
    requireInteraction: payload.requireInteraction,
    timestamp: Date.now(),
  });

  let sent = 0;
  const dead: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: s.keys },
          body,
          { TTL: 3600, urgency: "high" },
        );
        sent += 1;
      } catch (err: any) {
        // 404/410 mean the browser dropped the subscription for good
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          dead.push(s.endpoint);
        }
      }
    }),
  );

  if (dead.length) {
    await PushSubscription.deleteMany({ endpoint: { $in: dead } });
  }
  if (sent) {
    await PushSubscription.updateMany(
      { endpoint: { $nin: dead } },
      { $set: { lastSentAt: new Date() } },
    );
  }

  return { sent, removed: dead.length };
}
