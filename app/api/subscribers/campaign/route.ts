import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import Subscriber from "@/models/Subscriber";
import Campaign from "@/models/Campaign";
import SiteSettings from "@/models/SiteSettings";
import { verifyToken } from "@/lib/auth";
import { sendCampaignEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/seo";
import { webData } from "@/constants/webData";

/** Gmail's SMTP relay throttles hard; a handful at a time keeps it happy. */
const BATCH = 5;
const PAUSE_MS = 900;

async function requireOwner() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  const s: any = await verifyToken(token);
  // Sending to the whole list is not something an admin should be able to do
  return s?.role === "owner" ? s : null;
}

/**
 * POST — send a campaign to every active subscriber.
 *
 * A `testTo` address sends one copy and records nothing, which is how the
 * owner checks the rendering before committing to the real list.
 */
export async function POST(req: Request) {
  try {
    const owner = await requireOwner();
    if (!owner) {
      return NextResponse.json(
        { success: false, message: "Owner access only" },
        { status: 403 },
      );
    }

    const {
      subject,
      body,
      ctaLabel = "",
      ctaUrl = "",
      topic = "custom",
      aiDrafted = false,
      testTo = "",
    } = await req.json();

    if (!subject?.trim() || !body?.trim()) {
      return NextResponse.json(
        { success: false, message: "A subject and a body are both required" },
        { status: 400 },
      );
    }

    await dbConnect();
    const settings: any = await SiteSettings.findOne({ key: "global" }).lean();
    const siteName = settings?.websiteName || webData.websiteName;

    const unsubUrl = (token: string) =>
      `${SITE_URL}/unsubscribe?token=${encodeURIComponent(token)}`;

    // ── Test send: one copy, nothing recorded ──────────────────────────────
    if (testTo) {
      await sendCampaignEmail({
        to: testTo,
        subject,
        body,
        ctaLabel,
        ctaUrl,
        unsubscribeUrl: unsubUrl("preview"),
        siteName,
        siteUrl: SITE_URL,
      });
      return NextResponse.json({
        success: true,
        test: true,
        message: `Test sent to ${testTo}`,
      });
    }

    /**
     * Backfill unsubscribe tokens.
     *
     * Rows created before tokens existed have none, and an unsubscribe link
     * with no token behind it is a dead link on every email they receive —
     * which is how a list gets reported as spam rather than left.
     */
    const untokened: any[] = await Subscriber.find({
      $or: [{ token: { $exists: false } }, { token: "" }, { token: null }],
    })
      .select("_id")
      .lean();

    if (untokened.length) {
      await Promise.all(
        untokened.map((s) =>
          Subscriber.updateOne(
            { _id: s._id },
            { $set: { token: crypto.randomBytes(24).toString("hex") } },
          ),
        ),
      );
    }

    const recipients: any[] = await Subscriber.find({
      subscribed: { $ne: false },
    }).lean();

    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, message: "Nobody is subscribed yet" },
        { status: 400 },
      );
    }

    const failures: string[] = [];
    let sent = 0;

    for (let i = 0; i < recipients.length; i += BATCH) {
      const slice = recipients.slice(i, i + BATCH);

      await Promise.all(
        slice.map(async (sub) => {
          try {
            await sendCampaignEmail({
              to: sub.email,
              subject,
              body,
              ctaLabel,
              ctaUrl,
              unsubscribeUrl: unsubUrl(sub.token),
              siteName,
              siteUrl: SITE_URL,
            });
            sent += 1;
            await Subscriber.updateOne(
              { _id: sub._id },
              { $set: { lastSentAt: new Date() } },
            ).catch(() => {});
          } catch {
            failures.push(sub.email);
          }
        }),
      );

      if (i + BATCH < recipients.length) {
        await new Promise((r) => setTimeout(r, PAUSE_MS));
      }
    }

    const campaign = await Campaign.create({
      subject,
      body,
      ctaLabel,
      ctaUrl,
      topic,
      aiDrafted,
      sentCount: sent,
      failedCount: failures.length,
      failures: failures.slice(0, 50),
      sentBy: owner.username || "owner",
    });

    return NextResponse.json({
      success: true,
      message: `Sent to ${sent} of ${recipients.length}`,
      sent,
      failed: failures.length,
      campaign,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/** Sending a few hundred emails takes longer than the default budget. */
export const maxDuration = 300;
