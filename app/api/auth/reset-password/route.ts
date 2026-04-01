import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { updateUserPassword } from "@/lib/userHelper";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields",
          desc: "Please fill in all the fields",
        },
        { status: 400 },
      );
    }

    const payload: any = await verifyToken(token);
    if (!payload || payload.type !== "password_reset") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired reset token",
          desc: "Please try again",
        },
        { status: 401 },
      );
    }

    const updated = await updateUserPassword(payload.email, password);
    if (updated.success) {
      return NextResponse.json(
        {
          success: true,
          message: "Password updated successfully",
          desc: "Please login again",
        },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          message: updated.message,
          desc: "Please try again",
        },
        { status: 404 },
      );
    }
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
