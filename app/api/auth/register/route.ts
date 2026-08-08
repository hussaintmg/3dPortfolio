import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { findUser, createUser } from "@/lib/userHelper";
import { guardRate } from "@/lib/rateLimit";
import { sendTemplatedEmail } from "@/lib/email";
import {
  createVerificationToken,
  verificationEmailHtml,
} from "@/lib/emailVerification";
import { webData } from "@/constants/webData";

/** Origin of this request, so the link works on any host or port. */
function selfOrigin(req: Request) {
  const host = req.headers.get("host");
  if (!host) return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  try {
    // Abuse protection: 3 registrations/hour per IP
    const limited = guardRate(req, "register", 3, 60 * 60_000);
    if (limited) return limited;

    const { name, email, password, confirmPassword } = await req.json();

    const username = name.toLowerCase().replace(/\s+/g, "");
    const displayName = name;

    if (!username || !email || !password || !confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields",
          desc: "Please fill all the fields",
        },
        { status: 400 },
      );
    }
    const existingUser = (await findUser(email)) || (await findUser(username));
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User already exists",
          desc: "Choose a different email or username",
        },
        { status: 400 },
      );
    }

    const user = await createUser({
      username,
      displayName,
      email,
      password,
      confirmPassword,
    });

    if (user && user.success === false) {
      return NextResponse.json(
        {
          success: false,
          message: user.message || "Registration failed",
          desc: "Please try again",
        },
        { status: 400 },
      );
    }

    const token = await signToken({
      id: user._id.toString(),
      role: user.role,
      username: user.username,
      status: user.status,
    });

    /**
     * Confirmation email, sent but never waited on.
     * A mail server having a bad day must not fail a registration that has
     * already succeeded — the account works either way, and the link can be
     * resent from the profile screen.
     */
    let verificationSent = false;
    try {
      const jwt = await createVerificationToken({
        sub: user._id.toString(),
        email: user.email,
      });
      const url = `${await selfOrigin(req)}/verify-email?token=${encodeURIComponent(jwt)}`;
      await sendTemplatedEmail({
        to: user.email,
        subject: `Confirm your email · ${webData.websiteName}`,
        html: verificationEmailHtml({
          name: user.username || "there",
          url,
          siteName: webData.websiteName,
        }),
      });
      user.verificationSentAt = new Date();
      await user.save();
      verificationSent = true;
    } catch {
      // logged nowhere on purpose: the address may simply be undeliverable
    }

    const response = NextResponse.json({
      success: true,
      message: "Registration successful",
      desc: verificationSent
        ? "Check your inbox to confirm your email"
        : "Welcome to the Nexus",
      verificationSent,
      user: { username: user.username, email: user.email, role: user.role },
    });

    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
        desc: "Please try again",
      },
      { status: 500 },
    );
  }
}
