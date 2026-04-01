import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { getUserById, fetchUsers } from "@/lib/userHelper";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const payload = (await verifyToken(token)) as any;
    if (!payload || !payload.id) {
      return NextResponse.json({ success: false, message: "Invalid session" }, { status: 401 });
    }

    const user = await getUserById(payload.id);
    if (!user || user.role !== "owner") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const admins = await fetchUsers({ role: "admin" });
    
    return NextResponse.json({
      success: true,
      admins: admins.map(admin => ({
        id: admin._id,
        username: admin.username,
        email: admin.email,
        displayName: admin.displayName,
        status: admin.status,
        createdAt: admin.createdAt,
      })),
    }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
