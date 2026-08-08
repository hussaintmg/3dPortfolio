import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import PaymentSettings, { PAYMENT_METHODS } from "@/models/PaymentSettings";
import { verifyToken } from "@/lib/auth";

/** Fields that must never reach the browser. */
const SECRET_FIELDS = ["apiKey", "webhookSecret"] as const;

/** Public-facing shape: enabled methods + what a client needs to pay. */
function publicMethod(m: any = {}) {
  return {
    enabled: !!m.enabled,
    instructions: m.instructions || "",
    accountTitle: m.accountTitle || "",
    accountNumber: m.accountNumber || "",
    iban: m.iban || "",
    bankName: m.bankName || "",
    branch: m.branch || "",
    swift: m.swift || "",
    phone: m.phone || "",
    email: m.email || "",
    paymentLink: m.paymentLink || "",
    currency: m.currency || "",
    environment: m.environment || "sandbox",
  };
}

/** Owner view: same, plus whether each secret has been set. */
function ownerMethod(m: any = {}) {
  return {
    ...publicMethod(m),
    vendorId: m.vendorId || "",
    hasApiKey: !!m.apiKey,
    hasWebhookSecret: !!m.webhookSecret,
  };
}

export async function GET() {
  try {
    await dbConnect();
    const store = await cookies();
    const token = store.get("auth_token")?.value;
    const user: any = token ? await verifyToken(token) : null;
    const isStaff = user?.role === "admin" || user?.role === "owner";

    const doc: any =
      (await PaymentSettings.findOne({ key: "global" }).lean()) || {};

    const methods: Record<string, any> = {};
    for (const id of PAYMENT_METHODS) {
      methods[id] = isStaff ? ownerMethod(doc[id]) : publicMethod(doc[id]);
    }

    // Clients only need to see what they can actually use
    if (!isStaff) {
      for (const id of PAYMENT_METHODS) {
        if (!methods[id].enabled) delete methods[id];
      }
    }

    return NextResponse.json({
      success: true,
      intro: doc.intro || "",
      methods,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/** PUT — owner only. Blank secret fields are left untouched. */
export async function PUT(req: Request) {
  try {
    await dbConnect();
    const store = await cookies();
    const token = store.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const user: any = await verifyToken(token);
    if (!user || user.role !== "owner")
      return NextResponse.json(
        { success: false, message: "Only the owner can change payment settings" },
        { status: 403 },
      );

    const body = await req.json();
    const existing: any =
      (await PaymentSettings.findOne({ key: "global" }).lean()) || {};

    const update: any = {};
    if (body.intro !== undefined) update.intro = String(body.intro).slice(0, 600);

    for (const id of PAYMENT_METHODS) {
      const incoming = body.methods?.[id];
      if (!incoming) continue;

      const merged: any = { ...(existing[id] || {}) };
      for (const [k, v] of Object.entries(incoming)) {
        // An empty secret means "keep what's stored", not "erase it"
        if ((SECRET_FIELDS as readonly string[]).includes(k) && !v) continue;
        if (k.startsWith("has")) continue;
        merged[k] = typeof v === "string" ? v.slice(0, 1000) : v;
      }
      merged.enabled = !!incoming.enabled;
      update[id] = merged;
    }

    const saved: any = await PaymentSettings.findOneAndUpdate(
      { key: "global" },
      { $set: update },
      { new: true, upsert: true },
    ).lean();

    const methods: Record<string, any> = {};
    for (const id of PAYMENT_METHODS) methods[id] = ownerMethod(saved[id]);

    return NextResponse.json({
      success: true,
      message: "Payment settings saved",
      intro: saved.intro || "",
      methods,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
