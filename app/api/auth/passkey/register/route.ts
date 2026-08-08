import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import dbConnect from "@/lib/mongoose";
import Passkey from "@/models/Passkey";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import {
  getRpInfo,
  saveChallenge,
  readChallenge,
  clearChallenge,
} from "@/lib/webauthn";

async function currentUser() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  return (await verifyToken(token)) as any;
}

/** GET — options for enrolling a new fingerprint/face/device credential. */
export async function GET(req: Request) {
  try {
    const session = await currentUser();
    if (!session)
      return NextResponse.json(
        { success: false, message: "Sign in first" },
        { status: 401 },
      );

    await dbConnect();
    const { rpID, rpName } = await getRpInfo();
    const user: any = await User.findById(session.id).select("username email").lean();
    const existing = await Passkey.find({ userId: session.id }).lean();

    const { searchParams } = new URL(req.url);
    // Default to the built-in sensor (Windows Hello / Touch ID). Passing
    // ?type=cross means a phone or security key instead.
    const crossPlatform = searchParams.get("type") === "cross";

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(String(session.id)),
      userName: user?.email || user?.username || "user",
      userDisplayName: user?.displayName || user?.username || "user",
      attestationType: "none",
      // Never enrol the same authenticator twice
      excludeCredentials: existing.map((c: any) => ({
        id: c.credentialId,
        transports: c.transports,
      })),
      authenticatorSelection: {
        /*
         * "platform" pins this to the device's own biometric sensor, so the
         * browser opens Windows Hello / Touch ID directly instead of the
         * "use a phone or security key" chooser.
         */
        authenticatorAttachment: crossPlatform ? "cross-platform" : "platform",
        /*
         * REQUIRED (not "preferred") is what makes it a discoverable
         * credential — without it the sign-in screen has nothing to offer
         * when the user hasn't typed an email first.
         */
        residentKey: "required",
        requireResidentKey: true,
        userVerification: "required",
      },
    });

    await saveChallenge(options.challenge);
    return NextResponse.json({ success: true, options });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/** POST — verify the authenticator's response and store the credential. */
export async function POST(req: Request) {
  try {
    const session = await currentUser();
    if (!session)
      return NextResponse.json(
        { success: false, message: "Sign in first" },
        { status: 401 },
      );

    await dbConnect();
    const { response, name } = await req.json();
    const expectedChallenge = await readChallenge();
    if (!expectedChallenge)
      return NextResponse.json(
        { success: false, message: "Challenge expired — try again" },
        { status: 400 },
      );

    const { rpID, origin } = await getRpInfo();
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    await clearChallenge();

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { success: false, message: "Could not verify this device" },
        { status: 400 },
      );
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    await Passkey.create({
      userId: session.id,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: credential.transports || [],
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      name: (name || "").slice(0, 40) || "Passkey",
    });

    return NextResponse.json({
      success: true,
      message: "Device registered — you can now sign in with it",
    });
  } catch (error: any) {
    await clearChallenge();
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
