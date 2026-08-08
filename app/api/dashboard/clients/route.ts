import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Invoice from "@/models/Invoice";
import PackageAssignment from "@/models/PackageAssignment";
import { verifyToken } from "@/lib/auth";

/**
 * Client directory for the dashboard: every non-staff account with their
 * package/invoice totals so the owner can spot who still owes money.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const user: any = await verifyToken(token);
    if (!user || (user.role !== "admin" && user.role !== "owner"))
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

    await dbConnect();
    const clients = await User.find({ role: "user" })
      .select("username displayName email profileImage createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const ids = clients.map((c: any) => String(c._id));
    const [invoices, assignments] = await Promise.all([
      Invoice.find({ userId: { $in: ids } })
        .select("userId total status dueDate")
        .lean(),
      PackageAssignment.find({ userId: { $in: ids } })
        .select("userId status paid")
        .lean(),
    ]);

    const now = Date.now();
    const enriched = clients.map((c: any) => {
      const id = String(c._id);
      const mine = invoices.filter((i: any) => i.userId === id);
      const open = mine.filter(
        (i: any) => i.status !== "paid" && i.status !== "cancelled",
      );
      const overdue = open.filter(
        (i: any) => i.dueDate && new Date(i.dueDate).getTime() < now,
      );
      return {
        ...c,
        packages: assignments.filter((a: any) => a.userId === id).length,
        invoices: mine.length,
        outstanding: open.reduce((s: number, i: any) => s + (i.total || 0), 0),
        overdueCount: overdue.length,
        // "Red list" = has payments past their due date
        redListed: overdue.length > 0,
      };
    });

    return NextResponse.json({ success: true, clients: enriched });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
