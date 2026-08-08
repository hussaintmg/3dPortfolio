import { NextResponse } from "next/server";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import dbConnect from "@/lib/mongoose";
import Passkey from "@/models/Passkey";
import User from "@/models/User";
import { signToken } from "@/lib/auth";
import {
  getRpInfo,
  saveChallenge,
  readChallenge,
  clearChallenge,
} from "@/lib/webauthn";

/**
 * GET — challenge for signing in. No credential list is sent, so the browser
 * offers whatever passkey it holds for this site (discoverable credentials);
 * that is what makes "just use your fingerprint" work with no email typed.
 */
export async function GET() {
  try {
    const { rpID } = await getRpInfo();
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
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

/** POST — verify the assertion and issue the normal session cookie. */
export async function POST(req: Request) {
  try {
    await dbConnect();
    const { response } = await req.json();
    const expectedChallenge = await readChallenge();
    if (!expectedChallenge)
      return NextResponse.json(
        { success: false, message: "Challenge expired — try again" },
        { status: 400 },
      );

    const stored: any = await Passkey.findOne({ credentialId: response?.id });
    if (!stored) {
      await clearChallenge();
      return NextResponse.json(
        { success: false, message: "This device isn't registered" },
        { status: 404 },
      );
    }

    const { rpID, origin } = await getRpInfo();
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: stored.credentialId,
        publicKey: new Uint8Array(Buffer.from(stored.publicKey, "base64url")),
        counter: stored.counter,
        transports: stored.transports,
      },
    });

    await clearChallenge();

    if (!verification.verified) {
      return NextResponse.json(
        { success: false, message: "Verification failed" },
        { status: 401 },
      );
    }

    // Counter tracking is what detects a cloned authenticator
    stored.counter = verification.authenticationInfo.newCounter;
    stored.lastUsedAt = new Date();
    await stored.save();

    const user: any = await User.findById(stored.userId).lean();
    if (!user)
      return NextResponse.json(
        { success: false, message: "Account no longer exists" },
        { status: 404 },
      );

    if (user.role === "admin" && user.status !== "approved") {
      return NextResponse.json(
        { success: false, message: "Your admin account is not approved yet" },
        { status: 403 },
      );
    }

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
    await clearChallenge();
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
