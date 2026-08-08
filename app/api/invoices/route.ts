import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import Invoice from "@/models/Invoice";
import { raiseNotification } from "@/lib/notifications";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";

async function requireUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return (await verifyToken(token)) as any;
}
const isStaff = (u: any) => u.role === "admin" || u.role === "owner";

/** GET → staff: all invoices (optionally ?userId=), client: only their own. */
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const filter: any = isStaff(user)
      ? searchParams.get("userId")
        ? { userId: searchParams.get("userId") }
        : {}
      : { userId: user.id };

    const status = searchParams.get("status");
    if (status) filter.status = status;

    const invoices = await Invoice.find(filter).sort({ createdAt: -1 }).lean();

    // Flag anything past its due date so the UI can red-list it
    const now = Date.now();
    const decorated = invoices.map((i: any) => ({
      ...i,
      isOverdue:
        i.status !== "paid" &&
        i.status !== "cancelled" &&
        i.dueDate &&
        new Date(i.dueDate).getTime() < now,
    }));

    return NextResponse.json({ success: true, invoices: decorated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** POST → create an invoice (staff only). */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!user || !isStaff(user))
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

    await dbConnect();
    const body = await req.json();
    const {
      userId,
      packageId = "",
      packageName = "",
      items = [],
      currency = "USD",
      discount = 0,
      status = "unpaid",
      dueDate,
      notes = "",
    } = body;

    if (!userId)
      return NextResponse.json(
        { success: false, message: "Client is required" },
        { status: 400 },
      );
    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json(
        { success: false, message: "At least one line item is required" },
        { status: 400 },
      );

    const client: any = await User.findById(userId)
      .select("username displayName email")
      .lean();

    const subtotal = items.reduce(
      (sum: number, i: any) =>
        sum + Number(i.quantity || 1) * Number(i.unitPrice || 0),
      0,
    );
    const total = Math.max(0, subtotal - Number(discount || 0));

    const count = await Invoice.countDocuments();
    const number = `INV-${String(count + 1).padStart(4, "0")}`;

    const invoice = await Invoice.create({
      number,
      userId,
      clientName: client?.displayName || client?.username || "",
      clientEmail: client?.email || "",
      packageId,
      packageName,
      items,
      currency,
      subtotal,
      discount,
      total,
      status,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes,
      issuedAt: new Date(),
    });

    try {
      await raiseNotification({
        type: "payment",
        title: `Invoice ${number} created`,
        body: `${client?.username || "Client"} — ${currency} ${total}`,
        link: "/dashboard/invoices",
      });
    } catch {}

    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
