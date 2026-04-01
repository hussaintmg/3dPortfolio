import { NextResponse } from "next/server";
import { findUser, setVerificationCode } from "@/lib/userHelper";
import { signToken } from "@/lib/auth";
import { forgotCodeEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { identifier } = await req.json();

    if (!identifier) {
      return NextResponse.json(
        { success: false, message: "Missing identifier", desc: "Please provide an email or username" },
        { status: 400 },
      );
    }

    const user = await findUser(identifier);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found", desc: "No account found with this email or username" },
        { status: 404 },
      );
    }

    // Generate 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const token = await signToken(
      { email: user.email, type: "forgot_session" },
      "15m",
    );

    // Store in-memory
    const storage = await setVerificationCode(user.email, code, 15 * 60 * 1000);
    if (!storage.success) {
      return NextResponse.json(
        { success: false, message: storage.message, desc: "Failed to store verification code" },
        { status: 500 },
      );
    }
    const emailRes = await forgotCodeEmail(user.email, code);

    if (!emailRes.success) {
      return NextResponse.json(
        { success: false, message: "Failed to send verification code.", desc: "Please try again later." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        token,
        message: "Verification code sent.",
        desc: "A verification code has been sent to yout email",
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error", desc: "An unexpected error occurred. Please try again later." },
      { status: 500 },
    );
  }
}
