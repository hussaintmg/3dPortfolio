import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import Passkey from "@/models/Passkey";
import { verifyToken } from "@/lib/auth";

async function currentUser() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  return (await verifyToken(token)) as any;
}

/** GET — the signed-in user's registered devices. */
export async function GET() {
  try {
    const session = await currentUser();
    if (!session)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const keys = await Passkey.find({ userId: session.id })
      .select("name deviceType backedUp createdAt lastUsedAt")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      passkeys: keys.map((k: any) => ({
        _id: String(k._id),
        name: k.name,
        deviceType: k.deviceType,
        backedUp: k.backedUp,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt || null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** DELETE ?id= — remove one of your own devices. */
export async function DELETE(req: Request) {
  try {
    const session = await currentUser();
    if (!session)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ success: false, message: "Missing id" }, { status: 400 });

    // Scoped to the owner of the credential — you can only delete your own
    const result = await Passkey.deleteOne({ _id: id, userId: session.id });
    if (result.deletedCount === 0)
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Device removed" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
