import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import PackageAssignment from "@/models/PackageAssignment";
import { verifyToken } from "@/lib/auth";

async function requireStaff() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  const user: any = await verifyToken(token);
  if (!user || (user.role !== "admin" && user.role !== "owner")) return null;
  return user;
}

/** PATCH — update status/notes, or mark paid (locks it against re-payment). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireStaff();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

    await dbConnect();
    const { id } = await params;
    const { status, paid, notes, projectUrl, price, expiresAt } = await req.json();

    const update: any = {};
    if (status !== undefined) update.status = status;
    if (notes !== undefined) update.notes = notes;
    if (projectUrl !== undefined) update.projectUrl = projectUrl;
    if (price !== undefined) update.price = price;
    if (expiresAt !== undefined)
      update.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (paid !== undefined) {
      update.paid = !!paid;
      update.paidAt = paid ? new Date() : null;
      if (paid) update.status = "paid";
    }

    const assignment = await PackageAssignment.findByIdAndUpdate(
      id,
      { $set: update },
      { returnDocument: "after" },
    );
    return NextResponse.json({ success: true, assignment });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** DELETE — remove an assignment (staff only). */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireStaff();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

    await dbConnect();
    const { id } = await params;
    await PackageAssignment.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Assignment removed" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
