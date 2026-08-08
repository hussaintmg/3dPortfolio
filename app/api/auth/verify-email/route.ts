import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import SiteSettings from "@/models/SiteSettings";
import { verifyToken } from "@/lib/auth";
import { sendTemplatedEmail } from "@/lib/email";
import {
  createVerificationToken,
  readVerificationToken,
  verificationEmailHtml,
  RESEND_COOLDOWN_MINUTES,
} from "@/lib/emailVerification";
import { webData } from "@/constants/webData";

/** Origin of the current request, so links work on any host or port. */
async function selfOrigin() {
  const h = await headers();
  const host = h.get("host");
  if (!host) return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ||
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

async function siteName() {
  try {
    const s: any = await SiteSettings.findOne({ key: "global" })
      .select("websiteName")
      .lean();
    return s?.websiteName || webData.websiteName;
  } catch {
    return webData.websiteName;
  }
}

/**
 * POST — send (or resend) the verification email.
 *
 * Works for the signed-in user by default; an explicit `email` is accepted so
 * the flow can also run right after registration.
 */
export async function POST(req: Request) {
  try {
    await dbConnect();

    const body = await req.json().catch(() => ({}) as any);
    const store = await cookies();
    const token = store.get("auth_token")?.value;
    const me: any = token ? await verifyToken(token) : null;

    const user = me
      ? await User.findById(me.id)
      : body.email
        ? await User.findOne({ email: String(body.email).toLowerCase().trim() })
        : null;

    /**
     * Always answer the same way for an unknown address. Saying "no such
     * account" here would turn this into a way to test whether an email is
     * registered.
     */
    const generic = NextResponse.json({
      success: true,
      message: "If that account exists, a verification email is on its way.",
    });

    if (!user) return generic;
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: "This email is already confirmed.",
      });
    }

    const last = user.verificationSentAt
      ? new Date(user.verificationSentAt).getTime()
      : 0;
    const waitMs = RESEND_COOLDOWN_MINUTES * 60 * 1000;
    if (last && Date.now() - last < waitMs) {
      const secondsLeft = Math.ceil((waitMs - (Date.now() - last)) / 1000);
      return NextResponse.json(
        {
          success: false,
          message: `Please wait ${secondsLeft}s before requesting another email.`,
          retryAfter: secondsLeft,
        },
        { status: 429 },
      );
    }

    const jwt = await createVerificationToken({
      sub: String(user._id),
      email: user.email,
    });
    const url = `${await selfOrigin()}/verify-email?token=${encodeURIComponent(jwt)}`;
    const name = await siteName();

    await sendTemplatedEmail({
      to: user.email,
      subject: `Confirm your email · ${name}`,
      html: verificationEmailHtml({
        name: user.username || "there",
        url,
        siteName: name,
      }),
    });

    user.verificationSentAt = new Date();
    await user.save();

    return generic;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/** GET ?token= — confirm the address. */
export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get("token");
    if (!token) {
      return NextResponse.json(
        { success: false, reason: "invalid", message: "Missing token" },
        { status: 400 },
      );
    }

    const result = await readVerificationToken(token);
    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          reason: result.reason,
          message:
            result.reason === "expired"
              ? "This link has expired. Ask for a new one."
              : "This link isn't valid.",
        },
        { status: 400 },
      );
    }

    await dbConnect();
    const user = await User.findById(result.claims.sub);
    if (!user) {
      return NextResponse.json(
        { success: false, reason: "invalid", message: "Account not found" },
        { status: 404 },
      );
    }

    // The address must still be the one the link was issued for — otherwise
    // an old link would confirm an address the user has since changed away
    // from, or worse, confirm one they never owned.
    if (user.email !== result.claims.email) {
      return NextResponse.json(
        {
          success: false,
          reason: "invalid",
          message: "This link was issued for a different email address.",
        },
        { status: 400 },
      );
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        email: user.email,
        message: "Already confirmed.",
      });
    }

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    await user.save();

    return NextResponse.json({
      success: true,
      email: user.email,
      message: "Email confirmed",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, reason: "invalid", message: error.message },
      { status: 500 },
    );
  }
}
