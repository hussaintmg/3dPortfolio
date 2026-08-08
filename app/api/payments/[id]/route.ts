import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import PaymentSubmission from "@/models/PaymentSubmission";
import Invoice from "@/models/Invoice";
import PackageAssignment from "@/models/PackageAssignment";
import { verifyToken } from "@/lib/auth";

async function requireStaff() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  const user: any = await verifyToken(token);
  if (!user || (user.role !== "admin" && user.role !== "owner")) return null;
  return user;
}

/**
 * PATCH { status: "confirmed" | "rejected", reviewNote }
 * Confirming settles the invoice and locks the client's package so they can
 * never be charged for it twice.
 */
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
    const { status, reviewNote } = await req.json();

    if (!["confirmed", "rejected"].includes(status))
      return NextResponse.json(
        { success: false, message: "status must be confirmed or rejected" },
        { status: 400 },
      );

    const submission: any = await PaymentSubmission.findById(id);
    if (!submission)
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    submission.status = status;
    submission.reviewNote = (reviewNote || "").slice(0, 500);
    submission.reviewedAt = new Date();
    await submission.save();

    if (status === "confirmed") {
      const invoice: any = await Invoice.findByIdAndUpdate(
        submission.invoiceId,
        {
          $set: {
            status: "paid",
            paidAt: new Date(),
            paymentMethod: submission.method,
            paymentReference: submission.reference,
          },
        },
        { returnDocument: "after" },
      );

      if (invoice?.packageId) {
        await PackageAssignment.updateMany(
          { userId: invoice.userId, packageId: invoice.packageId },
          { $set: { paid: true, paidAt: new Date(), status: "paid" } },
        );
      }
    }

    return NextResponse.json({
      success: true,
      submission,
      message:
        status === "confirmed"
          ? "Payment confirmed — the invoice is now marked paid"
          : "Payment report rejected",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

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
    await PaymentSubmission.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Report removed" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
