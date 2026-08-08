import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import Variable from "@/models/Variable";
import { verifyToken } from "@/lib/auth";
import { ensureBuiltinVariables, buildContext } from "@/lib/templateEngine";

async function requireStaff() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  const user: any = await verifyToken(token);
  if (!user || (user.role !== "admin" && user.role !== "owner")) return null;
  return user;
}

/** GET — every variable, grouped, with a live sample resolved from real data. */
export async function GET(req: Request) {
  try {
    const user = await requireStaff();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

    await ensureBuiltinVariables();
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get("invoiceId") || undefined;

    const [vars, context] = await Promise.all([
      Variable.find().sort({ group: 1, key: 1 }).lean(),
      buildContext({ invoiceId }),
    ]);

    const read = (path: string) =>
      path.split(".").reduce((a: any, p) => (a == null ? a : a[p]), context);

    return NextResponse.json({
      success: true,
      variables: (vars as any[]).map((v) => ({
        _id: String(v._id),
        key: v.key,
        label: v.label,
        group: v.group,
        path: v.path,
        sample: v.sample,
        fallback: v.fallback,
        description: v.description,
        system: !!v.system,
        // what this variable resolves to right now
        resolved: read(v.path || v.key) ?? null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** POST — create one variable, or bulk-import an array (JSON upload). */
export async function POST(req: Request) {
  try {
    const user = await requireStaff();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

    await dbConnect();
    const body = await req.json();
    const list = Array.isArray(body) ? body : Array.isArray(body?.variables) ? body.variables : [body];

    const valid = list.filter(
      (v: any) => v && typeof v.key === "string" && /^[a-zA-Z0-9_.-]+$/.test(v.key),
    );
    if (valid.length === 0)
      return NextResponse.json(
        { success: false, message: "No valid variables — each needs a key" },
        { status: 400 },
      );

    await Variable.bulkWrite(
      valid.map((v: any) => ({
        updateOne: {
          filter: { key: v.key },
          update: {
            $set: {
              label: v.label || v.key,
              group: v.group || "Custom",
              path: v.path || v.key,
              sample: v.sample || "",
              fallback: v.fallback || "",
              description: v.description || "",
            },
          },
          upsert: true,
        },
      })) as any,
    );

    return NextResponse.json({
      success: true,
      message: `${valid.length} variable(s) saved`,
      skipped: list.length - valid.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** DELETE ?key= — removes a custom variable (built-ins are protected). */
export async function DELETE(req: Request) {
  try {
    const user = await requireStaff();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (!key)
      return NextResponse.json({ success: false, message: "Missing key" }, { status: 400 });

    const doc: any = await Variable.findOne({ key });
    if (!doc)
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    if (doc.system)
      return NextResponse.json(
        { success: false, message: "Built-in variables can be edited but not deleted" },
        { status: 400 },
      );

    await Variable.deleteOne({ key });
    return NextResponse.json({ success: true, message: "Variable removed" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
