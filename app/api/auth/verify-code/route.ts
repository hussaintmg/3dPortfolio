import { NextResponse } from "next/server";
import { verifyToken, signToken } from "@/lib/auth";
import { findUser } from "@/lib/userHelper";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    const { token, code } = await req.json();

    if (!token || !code) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 },
      );
    }

    const decoded = (await verifyToken(token)) as {
      email: string;
      type?: string;
    } | null;
    if (!decoded || !decoded.email) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 },
      );
    }
    const user = await findUser(decoded.email);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 },
      );
    }

    const expiry = user.verificationCodeExpiry
      ? new Date(user.verificationCodeExpiry).getTime()
      : 0;
    const now = Date.now();

    if (expiry < now) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 },
      );
    }
    if (user.verificationCode !== code) {
      return NextResponse.json(
        { success: false, message: "Wrong Code" },
        { status: 401 },
      );
    }
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    await User.findOneAndUpdate(
      { email: user.email },
      {
        resetToken: resetCode,
        resetTokenExpiry: new Date(Date.now() + 3600000),
        verificationCode: null,
        verificationCodeExpiry: null,
      },
    );
    const resetToken = await signToken(
      { email: user.email, resetToken: resetCode, type: "password_reset" },
      "1h",
    );
    return NextResponse.json(
      { success: true, message: "Code Verified", token: resetToken },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
