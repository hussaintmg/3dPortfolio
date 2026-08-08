import { NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongoose";
import PaymentSettings from "@/models/PaymentSettings";
import Invoice from "@/models/Invoice";
import PackageAssignment from "@/models/PackageAssignment";
import PaymentSubmission from "@/models/PaymentSubmission";
import { raiseNotification } from "@/lib/notifications";

/**
 * Paddle Billing webhook.
 *
 * Paddle signs each request as `ts=<unix>;h1=<hmac-sha256 of "ts:body">`
 * using the notification secret from your Paddle dashboard. Point Paddle at
 * /api/webhooks/paddle and paste that secret into Dashboard → Payments.
 *
 * The invoice is matched via `custom_data.invoiceId`, so include that when
 * you create the Paddle checkout/transaction.
 */
function verifySignature(raw: string, header: string | null, secret: string) {
  if (!header || !secret) return false;

  const parts = Object.fromEntries(
    header.split(";").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    }),
  ) as Record<string, string>;

  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;

  // Reject anything older than five minutes to stop replays
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${ts}:${raw}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(h1, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    await dbConnect();

    const settings: any =
      (await PaymentSettings.findOne({ key: "global" }).lean()) || {};
    const secret = settings.paddle?.webhookSecret;

    if (!secret) {
      return NextResponse.json(
        { success: false, message: "Paddle webhook secret is not configured" },
        { status: 503 },
      );
    }

    const signature = req.headers.get("paddle-signature");
    if (!verifySignature(raw, signature, secret)) {
      return NextResponse.json(
        { success: false, message: "Invalid signature" },
        { status: 401 },
      );
    }

    const event = JSON.parse(raw);
    const type = event?.event_type || "";

    // Only completed money movements settle an invoice
    const settles =
      type === "transaction.completed" ||
      type === "transaction.paid" ||
      type === "subscription.payment_succeeded";

    if (!settles) {
      return NextResponse.json({ success: true, ignored: type });
    }

    const data = event.data || {};
    const invoiceId =
      data.custom_data?.invoiceId ||
      data.custom_data?.invoice_id ||
      data.checkout?.custom_data?.invoiceId;

    if (!invoiceId) {
      return NextResponse.json({
        success: true,
        message: "No invoiceId in custom_data — nothing to settle",
      });
    }

    const invoice: any = await Invoice.findById(invoiceId);
    if (!invoice)
      return NextResponse.json({ success: true, message: "Unknown invoice" });

    if (invoice.status !== "paid") {
      invoice.status = "paid";
      invoice.paidAt = new Date();
      invoice.paymentMethod = "Paddle";
      invoice.paymentReference = data.id || data.transaction_id || "";
      await invoice.save();

      if (invoice.packageId) {
        await PackageAssignment.updateMany(
          { userId: invoice.userId, packageId: invoice.packageId },
          { $set: { paid: true, paidAt: new Date(), status: "paid" } },
        );
      }

      await PaymentSubmission.updateMany(
        { invoiceId: String(invoice._id), status: "pending" },
        { $set: { status: "confirmed", reviewedAt: new Date(), reviewNote: "Auto-confirmed by Paddle" } },
      );

      try {
        await raiseNotification({
          type: "payment",
          title: `Paddle payment received — ${invoice.number}`,
          body: `${invoice.currency} ${invoice.total} from ${invoice.clientName || "client"}`,
          link: "/dashboard/payments",
        });
      } catch {}
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
