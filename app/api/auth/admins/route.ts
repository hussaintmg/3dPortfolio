import { NextResponse } from "next/server";
import { fetchUsers, updateUserStatus, deleteUser } from "@/lib/userHelper";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ success: false }, { status: 401 });

    const user: any = await verifyToken(token);
    if (!user || user.role !== "owner") {
      return NextResponse.json({ success: false, message: "Only owners can view admins" }, { status: 403 });
    }

    const admins = await fetchUsers({ role: "admin" });

    return NextResponse.json({ success: true, admins });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ success: false }, { status: 401 });

    const owner: any = await verifyToken(token);
    if (!owner || owner.role !== "owner") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { adminId, status } = await req.json(); // status: 'approved' | 'suspended'
    const updated = await updateUserStatus(adminId, status);

    if (!updated) {
      return NextResponse.json({ success: false, message: "Admin not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Admin ${status}` });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ success: false }, { status: 401 });

    const owner: any = await verifyToken(token);
    if (!owner || owner.role !== "owner") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { adminId } = await req.json();
    const deleted = await deleteUser(adminId);

    if (!deleted) {
      return NextResponse.json({ success: false, message: "Admin not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Admin removed" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
