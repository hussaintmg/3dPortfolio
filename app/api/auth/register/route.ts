import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { findUser, createUser } from "@/lib/userHelper";

export async function POST(req: Request) {
  try {
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

    const response = NextResponse.json({
      success: true,
      message: "Registration successful",
      desc: "Welcome to the Nexus",
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
