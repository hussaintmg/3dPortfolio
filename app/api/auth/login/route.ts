import { NextResponse } from "next/server";
import { signToken, comparePassword } from "@/lib/auth";
import { findUser } from "@/lib/userHelper";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields",
          desc: "Please fill all the fields",
        },
        { status: 400 },
      );
    }

    const user = await findUser(email);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "No User Found",
          desc: "Your credentials do not match any existing account.",
        },
        { status: 401 },
      );
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Password",
          desc: "Your password does not match.",
        },
        { status: 401 },
      );
    }

    const tokenPayload = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role || "user",
    };

    const expiresIn = "7d";
    const token = await signToken(tokenPayload, expiresIn);

    // Using Next.js cookies API to set auth_token
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Internal Server Error",
        desc: error.desc || "An unexpected error occurred. Please try again later.",
      },
      { status: 500 },
    );
  }
}
