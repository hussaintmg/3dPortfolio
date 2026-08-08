import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import FaceProfile from "@/models/FaceProfile";
import User from "@/models/User";
import { signToken } from "@/lib/auth";
import { isDescriptor, matches, DEFAULT_THRESHOLD } from "@/lib/faceMatch";

/** A face is not a secret, so wrong guesses have to get expensive fast. */
const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

/**
 * POST — sign in with a face.
 *
 * The browser measures a descriptor and sends it here; the comparison
 * happens server-side so a tampered client cannot simply claim a match.
 * The account is identified by the descriptor itself, so nothing needs to
 * be typed first.
 */
export async function POST(req: Request) {
  try {
    const { descriptor, identifier } = await req.json();

    if (!isDescriptor(descriptor)) {
      return NextResponse.json(
        { success: false, message: "No usable face data" },
        { status: 400 },
      );
    }

    await dbConnect();

    // Narrowing to one account when we know who is signing in makes the
    // comparison both faster and stricter.
    let profiles: any[] = [];
    if (identifier) {
      const user: any = await User.findOne({
        $or: [
          { email: String(identifier).toLowerCase().trim() },
          { username: String(identifier).trim() },
        ],
      })
        .select("_id")
        .lean();
      if (!user) {
        return NextResponse.json(
          { success: false, message: "Face not recognised" },
          { status: 401 },
        );
      }
      profiles = await FaceProfile.find({ userId: user._id });
    } else {
      profiles = await FaceProfile.find({});
    }

    if (profiles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No face is enrolled yet. Sign in once, then set it up.",
        },
        { status: 404 },
      );
    }

    const now = new Date();
    let best: { profile: any; distance: number } | null = null;

    for (const profile of profiles) {
      if (profile.lockedUntil && profile.lockedUntil > now) continue;
      const { distance } = matches(descriptor, profile.samples);
      if (!best || distance < best.distance) best = { profile, distance };
    }

    if (!best) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many failed attempts. Try again in ${LOCK_MINUTES} minutes or use your password.`,
        },
        { status: 429 },
      );
    }

    if (best.distance > DEFAULT_THRESHOLD) {
      // Only count failures against a profile we were actually aiming at
      if (identifier) {
        best.profile.failedAttempts += 1;
        if (best.profile.failedAttempts >= MAX_FAILURES) {
          best.profile.lockedUntil = new Date(
            Date.now() + LOCK_MINUTES * 60 * 1000,
          );
          best.profile.failedAttempts = 0;
        }
        await best.profile.save();
      }
      return NextResponse.json(
        { success: false, message: "Face not recognised" },
        { status: 401 },
      );
    }

    const user: any = await User.findById(best.profile.userId).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Account no longer exists" },
        { status: 404 },
      );
    }
    if (user.role === "admin" && user.status !== "approved") {
      return NextResponse.json(
        { success: false, message: "Your admin account is not approved yet" },
        { status: 403 },
      );
    }

    best.profile.failedAttempts = 0;
    best.profile.lockedUntil = null;
    best.profile.lastUsedAt = now;
    await best.profile.save();

    const token = await signToken({
      id: String(user._id),
      role: user.role,
      username: user.username,
      status: user.status,
    });

    const res = NextResponse.json({
      success: true,
      message: "Signed in",
      user: { username: user.username, email: user.email, role: user.role },
    });
    res.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
    });
    return res;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
