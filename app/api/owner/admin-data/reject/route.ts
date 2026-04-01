import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { getUserById, updateUserStatus } from "@/lib/userHelper";
import { adminRejectedEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { adminId } = await req.json();

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const payload = (await verifyToken(token)) as any;
    const user = await getUserById(payload.id);
    if (!user || user.role !== "owner") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const updatedAdmin = await updateUserStatus(adminId, "suspended");
    if (!updatedAdmin) {
      return NextResponse.json({ success: false, message: "Admin not found" }, { status: 404 });
    }

    // Send Rejection Email
    await adminRejectedEmail(updatedAdmin.email, updatedAdmin.username);

    return NextResponse.json({
      success: true,
      message: "Admin rejected successfully and notified via email.",
      admin: {
        id: updatedAdmin._id,
        status: updatedAdmin.status
      }
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
