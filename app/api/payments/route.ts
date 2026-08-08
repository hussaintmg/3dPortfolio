import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import PaymentSubmission from "@/models/PaymentSubmission";
import PaymentSettings, { PAYMENT_METHODS } from "@/models/PaymentSettings";
import Invoice from "@/models/Invoice";
import { raiseNotification } from "@/lib/notifications";
import { verifyToken } from "@/lib/auth";

async function currentUser() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  return (await verifyToken(token)) as any;
}
const isStaff = (u: any) => u?.role === "admin" || u?.role === "owner";

/** GET — staff see everything (optionally ?status=), clients see their own. */
export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const filter: any = isStaff(user) ? {} : { userId: user.id };
    const status = searchParams.get("status");
    if (status) filter.status = status;

    const submissions = await PaymentSubmission.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      submissions: (submissions as any[]).map((s) => ({
        ...s,
        _id: String(s._id),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** POST — a client reports that they've paid an invoice. */
export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const { invoiceId, method, reference, note, proofUrl, proofStorageKey } =
      await req.json();

    if (!invoiceId || !method)
      return NextResponse.json(
        { success: false, message: "Invoice and method are required" },
        { status: 400 },
      );

    if (!PAYMENT_METHODS.includes(method))
      return NextResponse.json(
        { success: false, message: "Unknown payment method" },
        { status: 400 },
      );

    // The method has to actually be switched on
    const settings: any =
      (await PaymentSettings.findOne({ key: "global" }).lean()) || {};
    if (!settings[method]?.enabled)
      return NextResponse.json(
        { success: false, message: "That payment method isn't available" },
        { status: 400 },
      );

    const invoice: any = await Invoice.findById(invoiceId).lean();
    if (!invoice)
      return NextResponse.json({ success: false, message: "Invoice not found" }, { status: 404 });

    // Clients may only report against their own invoices
    if (!isStaff(user) && invoice.userId !== user.id)
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    if (invoice.status === "paid")
      return NextResponse.json(
        { success: false, message: "This invoice is already settled" },
        { status: 409 },
      );

    // One open report per invoice keeps the inbox honest
    const existing = await PaymentSubmission.findOne({
      invoiceId,
      status: "pending",
    });
    if (existing)
      return NextResponse.json(
        {
          success: false,
          message: "You've already reported this payment — it's awaiting review",
        },
        { status: 409 },
      );

    const submission = await PaymentSubmission.create({
      invoiceId,
      invoiceNumber: invoice.number,
      userId: invoice.userId,
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail,
      method,
      amount: invoice.total,
      currency: invoice.currency,
      reference: (reference || "").slice(0, 200),
      note: (note || "").slice(0, 1000),
      proofUrl: proofUrl || "",
      proofStorageKey: proofStorageKey || "",
    });

    try {
      await raiseNotification({
        type: "payment",
        title: `Payment reported for ${invoice.number}`,
        body: `${invoice.clientName || "A client"} says they paid ${invoice.currency} ${invoice.total} by ${method}`,
        link: "/dashboard/payments",
      });
    } catch {}

    return NextResponse.json({
      success: true,
      submission,
      message: "Thanks — I'll confirm this shortly.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
