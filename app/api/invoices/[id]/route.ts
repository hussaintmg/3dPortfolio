import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import Invoice from "@/models/Invoice";
import PackageAssignment from "@/models/PackageAssignment";
import { verifyToken } from "@/lib/auth";

async function requireUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return (await verifyToken(token)) as any;
}
const isStaff = (u: any) => u.role === "admin" || u.role === "owner";

/** GET one invoice — clients may only read their own. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const { id } = await params;
    const invoice: any = await Invoice.findById(id).lean();
    if (!invoice)
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    if (!isStaff(user) && invoice.userId !== user.id)
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * PATCH — staff only. Used to mark an invoice paid (from ANY source: bank
 * transfer, JazzCash, EasyPaisa, cash…) or to change status/notes.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    if (!user || !isStaff(user))
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const { status, paymentMethod, paymentReference, notes, dueDate } = body;

    const update: any = {};
    if (status !== undefined) update.status = status;
    if (paymentMethod !== undefined) update.paymentMethod = paymentMethod;
    if (paymentReference !== undefined) update.paymentReference = paymentReference;
    if (notes !== undefined) update.notes = notes;
    if (dueDate !== undefined) update.dueDate = dueDate ? new Date(dueDate) : null;
    if (status === "paid") update.paidAt = new Date();

    const invoice: any = await Invoice.findByIdAndUpdate(id, { $set: update }, {
      returnDocument: "after",
    });

    // Paying an invoice locks its package so the client can't be charged twice
    if (status === "paid" && invoice?.packageId) {
      await PackageAssignment.updateMany(
        { userId: invoice.userId, packageId: invoice.packageId },
        { $set: { paid: true, paidAt: new Date(), status: "paid" } },
      );
    }

    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** DELETE — staff only. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    if (!user || !isStaff(user))
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

    await dbConnect();
    const { id } = await params;
    await Invoice.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Invoice deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
