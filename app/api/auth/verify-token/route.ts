import { NextResponse } from "next/server";
import { verifyToken, signToken } from "@/lib/auth";
import { findUser } from "@/lib/userHelper";

export async function POST(req: Request) {
  try {
    const { token, type } = await req.json();

    if (!token || !type) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 },
      );
    }

    const decoded = (await verifyToken(token)) as {
      email: string;
      type?: string;
      resetToken?: string;
    } | null;
    if (!decoded || !decoded.email) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 },
      );
    }
    const user = await findUser(decoded.email);

    if (type === "forgot") {
      if (!user) {
        return NextResponse.json(
          { success: false, message: "Invalid or expired token" },
          { status: 401 },
        );
      }

      const expiry = user.verificationCodeExpiry
        ? new Date(user.verificationCodeExpiry).getTime()
        : 0;
      if (expiry < Date.now()) {
        return NextResponse.json(
          { success: false, message: "Invalid or expired token" },
          { status: 401 },
        );
      }
      return NextResponse.json(
        { success: true, message: "Token valid, awaiting code" },
        { status: 200 },
      );
    }

    if (type === "reset") {
      if (!user) {
        return NextResponse.json(
          { success: false, message: "Invalid or expired token" },
          { status: 401 },
        );
      }
      if (!decoded || !decoded.resetToken) {
        return NextResponse.json(
          { success: false, message: "Invalid or expired token" },
          { status: 401 },
        );
      }

      const resetExpiry = user.resetTokenExpiry
        ? new Date(user.resetTokenExpiry).getTime()
        : 0;

      // Check if it's a valid password_reset token using the already decoded payload
      if (
        decoded.type === "password_reset" &&
        user.resetToken === decoded.resetToken &&
        resetExpiry > Date.now()
      ) {
        return NextResponse.json(
          { success: true, message: "Reset token valid" },
          { status: 200 },
        );
      } else {
        return NextResponse.json(
          { success: false, message: "Invalid or expired reset token" },
          { status: 401 },
        );
      }
    }

    return NextResponse.json(
      { success: false, message: "Unknown verification type" },
      { status: 400 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
