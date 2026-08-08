import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import PackageAssignment from "@/models/PackageAssignment";
import Invoice from "@/models/Invoice";
import Package from "@/models/Package";
import User from "@/models/User";
import ChatMessage from "@/models/ChatMessage";
import { verifyToken } from "@/lib/auth";
import { raiseNotification } from "@/lib/notifications";
import { needsDecision, isConsumed } from "@/lib/packageFlow";

async function requireStaff() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  const s: any = await verifyToken(token);
  return s?.role === "owner" || s?.role === "admin" ? s : null;
}

/**
 * POST — the owner approves or declines a client's request.
 *
 * Approving is what creates the invoice, and the invoice is what makes
 * payment possible. Nothing before this point can be paid, which is the
 * guarantee the whole flow exists to provide.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const staff = await requireStaff();
    if (!staff) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const { decision, reason = "", dueInDays = 7 } = await req.json();

    if (!["approve", "decline"].includes(decision)) {
      return NextResponse.json(
        { success: false, message: "Approve or decline?" },
        { status: 400 },
      );
    }

    await dbConnect();
    const assignment = await PackageAssignment.findById(id);
    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Not found" },
        { status: 404 },
      );
    }
    if (isConsumed(assignment)) {
      return NextResponse.json(
        { success: false, message: "This one is already paid for." },
        { status: 409 },
      );
    }
    if (!needsDecision(assignment)) {
      return NextResponse.json(
        {
          success: false,
          message: `Nothing to decide — this is currently "${assignment.status}".`,
        },
        { status: 409 },
      );
    }

    const client: any = await User.findById(assignment.userId)
      .select("username email")
      .lean();

    if (decision === "decline") {
      assignment.status = "declined";
      assignment.declinedAt = new Date();
      assignment.declineReason = String(reason).slice(0, 300);
      await assignment.save();

      await notifyClient(
        assignment.userId,
        "Package request declined",
        assignment.packageName +
          (reason ? ` — ${String(reason).slice(0, 90)}` : ""),
        String(assignment._id),
      );
      await sayInChat(
        staff,
        assignment.userId,
        `I can't take on "${assignment.packageName}" as it stands${
          reason ? ` — ${reason}` : ""
        }. Happy to talk through an alternative.`,
      );

      return NextResponse.json({ success: true, assignment });
    }

    // ── Approve: raise the invoice the client will pay against ─────────────
    const pkg: any = assignment.packageId
      ? await Package.findById(assignment.packageId).lean()
      : null;

    const count = await Invoice.countDocuments();
    const number = `INV-${String(count + 1).padStart(4, "0")}`;
    const amount = Number(assignment.price) || 0;

    const invoice = await Invoice.create({
      number,
      userId: assignment.userId,
      clientName: client?.username || "",
      clientEmail: client?.email || "",
      packageId: assignment.packageId,
      packageName: assignment.packageName,
      items: [
        {
          description: assignment.packageName || pkg?.name || "Package",
          quantity: 1,
          unitPrice: amount,
        },
      ],
      currency: assignment.currency || "USD",
      subtotal: amount,
      discount: 0,
      total: amount,
      status: "unpaid",
      notes: assignment.notes || "",
      issuedAt: new Date(),
      dueDate: new Date(Date.now() + Math.max(1, Number(dueInDays)) * 86400000),
    });

    assignment.status = "approved";
    assignment.approvedAt = new Date();
    assignment.approvedBy = staff.username || staff.id;
    assignment.invoiceId = String(invoice._id);
    assignment.invoiceNumber = number;
    await assignment.save();

    await notifyClient(
      assignment.userId,
      "Your package was approved",
      `${assignment.packageName} — invoice ${number} is ready to pay`,
      String(invoice._id),
      "invoice",
    );
    await sayInChat(
      staff,
      assignment.userId,
      `Approved "${assignment.packageName}". Invoice ${number} for ${assignment.currency || "USD"} ${amount} is in your portal — you can pay it whenever you're ready.`,
    );

    return NextResponse.json({ success: true, assignment, invoice });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

async function notifyClient(
  userId: string,
  title: string,
  body: string,
  entityId: string,
  type: "assignment" | "invoice" = "assignment",
) {
  try {
    await raiseNotification({ type, title, body, userIds: [userId], entityId });
  } catch {
    // the portal shows it regardless
  }
}

/** A line in the thread, so a decision never sits unnoticed in the portal. */
async function sayInChat(staff: any, userId: string, text: string) {
  try {
    await ChatMessage.create({
      conversationId: userId,
      senderId: staff.id,
      senderName: staff.username || "Hussain",
      senderRole: staff.role,
      type: "text",
      text,
      readBy: [staff.id],
    });
  } catch {
    // cosmetic
  }
}
