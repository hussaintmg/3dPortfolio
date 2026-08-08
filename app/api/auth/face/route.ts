import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import FaceProfile from "@/models/FaceProfile";
import { verifyToken } from "@/lib/auth";
import { isDescriptor, sampleQuality } from "@/lib/faceMatch";

/** Enough angles to survive a change of lighting or a pair of glasses. */
const MIN_SAMPLES = 3;
const MAX_SAMPLES = 8;

async function currentUser() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  return (await verifyToken(token)) as any;
}

const unauthorized = () =>
  NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

/** GET — whether this account has face unlock, never the descriptors. */
export async function GET() {
  try {
    const session = await currentUser();
    if (!session) return unauthorized();

    await dbConnect();
    const profile: any = await FaceProfile.findOne({ userId: session.id })
      .select("samples label lastUsedAt createdAt lockedUntil")
      .lean();

    return NextResponse.json({
      success: true,
      enrolled: !!profile?.samples?.length,
      profile: profile
        ? {
            label: profile.label,
            sampleCount: profile.samples.length,
            createdAt: profile.createdAt,
            lastUsedAt: profile.lastUsedAt || null,
            locked: profile.lockedUntil
              ? new Date(profile.lockedUntil) > new Date()
              : false,
          }
        : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/** POST — enrol (or re-enrol) this account's face from several samples. */
export async function POST(req: Request) {
  try {
    const session = await currentUser();
    if (!session) return unauthorized();

    const { samples, label } = await req.json();

    if (!Array.isArray(samples) || samples.length < MIN_SAMPLES) {
      return NextResponse.json(
        {
          success: false,
          message: `Need at least ${MIN_SAMPLES} good captures`,
        },
        { status: 400 },
      );
    }
    if (!samples.every(isDescriptor)) {
      return NextResponse.json(
        { success: false, message: "Malformed face data" },
        { status: 400 },
      );
    }

    // All samples must plausibly be the same person, or unlock would let in
    // whoever happened to walk past during enrolment.
    const quality = sampleQuality(samples);
    if (!quality.consistent) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Those captures don't look like the same person. Try again with just you in frame.",
        },
        { status: 400 },
      );
    }

    await dbConnect();
    const trimmed = samples.slice(0, MAX_SAMPLES);

    await FaceProfile.findOneAndUpdate(
      { userId: session.id },
      {
        $set: {
          samples: trimmed,
          label: (label || "My face").slice(0, 40),
          failedAttempts: 0,
          lockedUntil: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return NextResponse.json({
      success: true,
      message: "Face unlock is set up",
      sampleCount: trimmed.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/** DELETE — remove face unlock for this account. */
export async function DELETE() {
  try {
    const session = await currentUser();
    if (!session) return unauthorized();

    await dbConnect();
    await FaceProfile.deleteOne({ userId: session.id });

    return NextResponse.json({ success: true, message: "Face unlock removed" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
