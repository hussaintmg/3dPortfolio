import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import DocumentTemplate from "@/models/DocumentTemplate";
import { verifyToken } from "@/lib/auth";
import { DEFAULT_TEMPLATES } from "@/lib/defaultTemplates";

async function requireStaff() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  const user: any = await verifyToken(token);
  if (!user || (user.role !== "admin" && user.role !== "owner")) return null;
  return user;
}

/** Seeds the starter templates once so the library is never empty. */
async function ensureDefaults() {
  const count = await DocumentTemplate.countDocuments();
  if (count > 0) return;
  await DocumentTemplate.insertMany(DEFAULT_TEMPLATES);
}

/** GET ?type=pdf|email */
export async function GET(req: Request) {
  try {
    const user = await requireStaff();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

    await dbConnect();
    await ensureDefaults();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const filter = type ? { type } : {};

    const templates = await DocumentTemplate.find(filter)
      .sort({ isDefault: -1, updatedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      templates: (templates as any[]).map((t) => ({
        ...t,
        _id: String(t._id),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** POST — create a template (optionally duplicating an existing one). */
export async function POST(req: Request) {
  try {
    const user = await requireStaff();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

    await dbConnect();
    const body = await req.json();

    if (body.duplicateOf) {
      const src: any = await DocumentTemplate.findById(body.duplicateOf).lean();
      if (!src)
        return NextResponse.json({ success: false, message: "Source not found" }, { status: 404 });
      const copy = await DocumentTemplate.create({
        name: `${src.name} (copy)`,
        type: src.type,
        scope: src.scope,
        subject: src.subject,
        html: src.html,
        css: src.css,
        design: src.design,
        engine: src.engine,
        description: src.description,
        isDefault: false,
      });
      return NextResponse.json({ success: true, template: copy });
    }

    const template = await DocumentTemplate.create({
      name: body.name || "Untitled template",
      type: body.type === "email" ? "email" : "pdf",
      scope: body.scope || "invoice",
      subject: body.subject || "",
      html: body.html || "",
      css: body.css || "",
      design: body.design || { elements: [], page: {} },
      engine: body.engine === "html" ? "html" : "designer",
      description: body.description || "",
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
