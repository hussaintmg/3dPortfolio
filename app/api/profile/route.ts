import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { verifyToken, signToken, hashPassword, comparePassword } from "@/lib/auth";

async function session() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  return (await verifyToken(token)) as any;
}

const clean = (u: any) => ({
  _id: String(u._id),
  username: u.username,
  email: u.email,
  role: u.role,
  status: u.status,
  avatarUrl: u.avatarUrl || "",
  fullName: u.fullName || "",
  phone: u.phone || "",
  company: u.company || "",
  country: u.country || "",
  bio: u.bio || "",
  emailVerified: !!u.emailVerified,
  createdAt: u.createdAt,
});

/** GET — the signed-in user's own profile. */
export async function GET() {
  try {
    const me = await session();
    if (!me) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    await dbConnect();
    const user = await User.findById(me.id).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Account not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, profile: clean(user) });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/** PUT — update your own details. Email and role are deliberately not here. */
export async function PUT(req: Request) {
  try {
    const me = await session();
    if (!me) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    await dbConnect();

    const update: Record<string, unknown> = {};

    if (body.username !== undefined) {
      const username = String(body.username).trim();
      if (username.length < 3) {
        return NextResponse.json(
          { success: false, message: "Username must be at least 3 characters" },
          { status: 400 },
        );
      }
      // Usernames identify people in chat, so they have to stay unique
      const taken = await User.findOne({
        username,
        _id: { $ne: me.id },
      }).lean();
      if (taken) {
        return NextResponse.json(
          { success: false, message: "That username is already taken" },
          { status: 409 },
        );
      }
      update.username = username;
    }

    for (const field of ["fullName", "phone", "company", "country", "bio"]) {
      if (body[field] !== undefined) {
        update[field] = String(body[field]).slice(0, field === "bio" ? 500 : 120);
      }
    }
    if (body.avatarUrl !== undefined) update.avatarUrl = String(body.avatarUrl);
    if (body.avatarStorageKey !== undefined) {
      update.avatarStorageKey = String(body.avatarStorageKey);
    }

    const user = await User.findByIdAndUpdate(
      me.id,
      { $set: update },
      { new: true },
    );
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Account not found" },
        { status: 404 },
      );
    }

    // The username is baked into the auth token, so reissue it on change
    const res = NextResponse.json({ success: true, profile: clean(user) });
    if (update.username) {
      const token = await signToken({
        id: String(user._id),
        role: user.role,
        username: user.username,
        status: user.status,
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
    }
    return res;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/** PATCH — change your password. Requires the current one. */
export async function PATCH(req: Request) {
  try {
    const me = await session();
    if (!me) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Both passwords are required" },
        { status: 400 },
      );
    }
    if (String(newPassword).length < 8) {
      return NextResponse.json(
        { success: false, message: "Use at least 8 characters" },
        { status: 400 },
      );
    }

    await dbConnect();
    const user = await User.findById(me.id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Account not found" },
        { status: 404 },
      );
    }

    // Never let a hijacked session change the password on its own
    const ok = await comparePassword(currentPassword, user.password);
    if (!ok) {
      return NextResponse.json(
        { success: false, message: "Current password is incorrect" },
        { status: 403 },
      );
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    return NextResponse.json({ success: true, message: "Password changed" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
