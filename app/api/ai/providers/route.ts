import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import AiProvider from "@/models/AiProvider";
import { verifyToken } from "@/lib/auth";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/secretBox";
import { PROVIDER_PRESETS, type ProviderKind } from "@/lib/ai/providers";

async function requireOwner() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  const session: any = await verifyToken(token);
  if (!session || session.role !== "owner") return null;
  return session;
}

const denied = () =>
  NextResponse.json(
    { success: false, message: "Only the owner can manage AI providers" },
    { status: 403 },
  );

/** Never leaks the key itself — only enough to recognise which one it is. */
const present = (doc: any) => ({
  _id: String(doc._id),
  label: doc.label,
  kind: doc.kind,
  model: doc.model,
  baseUrl: doc.baseUrl || "",
  enabled: doc.enabled,
  order: doc.order ?? 0,
  keyPreview: maskSecret(decryptSecret(doc.apiKey)),
  lastTest: doc.lastTest || null,
  successCount: doc.successCount || 0,
  failureCount: doc.failureCount || 0,
  lastUsedAt: doc.lastUsedAt || null,
  coolingDown: doc.cooldownUntil ? new Date(doc.cooldownUntil) > new Date() : false,
});

export async function GET() {
  try {
    if (!(await requireOwner())) return denied();
    await dbConnect();
    const docs = await AiProvider.find().sort({ order: 1, createdAt: 1 }).lean();
    return NextResponse.json({
      success: true,
      providers: docs.map(present),
      presets: PROVIDER_PRESETS,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    if (!(await requireOwner())) return denied();
    const { label, kind, apiKey, model, baseUrl, enabled } = await req.json();

    if (!label?.trim()) {
      return NextResponse.json(
        { success: false, message: "Give this key a name so you can tell them apart" },
        { status: 400 },
      );
    }
    if (!PROVIDER_PRESETS[kind as ProviderKind]) {
      return NextResponse.json(
        { success: false, message: "Unknown provider" },
        { status: 400 },
      );
    }
    if (!apiKey?.trim()) {
      return NextResponse.json(
        { success: false, message: "An API key is required" },
        { status: 400 },
      );
    }
    if (!model?.trim()) {
      return NextResponse.json(
        { success: false, message: "Pick a model" },
        { status: 400 },
      );
    }
    if (kind === "openai" && !baseUrl?.trim()) {
      return NextResponse.json(
        { success: false, message: "A custom provider needs its base URL" },
        { status: 400 },
      );
    }

    await dbConnect();
    const count = await AiProvider.countDocuments();
    const doc = await AiProvider.create({
      label: label.trim().slice(0, 60),
      kind,
      apiKey: encryptSecret(apiKey.trim()),
      model: model.trim(),
      baseUrl: (baseUrl || "").trim(),
      enabled: enabled !== false,
      order: count,
    });

    return NextResponse.json({ success: true, provider: present(doc) });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    if (!(await requireOwner())) return denied();
    const { id, label, model, baseUrl, enabled, apiKey, order } = await req.json();
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing provider id" },
        { status: 400 },
      );
    }

    await dbConnect();
    const update: any = {};
    if (label !== undefined) update.label = String(label).trim().slice(0, 60);
    if (model !== undefined) update.model = String(model).trim();
    if (baseUrl !== undefined) update.baseUrl = String(baseUrl).trim();
    if (enabled !== undefined) update.enabled = !!enabled;
    if (order !== undefined) update.order = Number(order) || 0;
    // An empty key field means "leave the stored one alone"
    if (apiKey?.trim()) {
      update.apiKey = encryptSecret(apiKey.trim());
      update.lastTest = { ok: null, at: null, message: "", latencyMs: null };
      update.cooldownUntil = null;
    }

    const doc = await AiProvider.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!doc) {
      return NextResponse.json(
        { success: false, message: "Provider not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, provider: present(doc) });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await requireOwner())) return denied();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing provider id" },
        { status: 400 },
      );
    }
    await dbConnect();
    await AiProvider.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
