import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import DocumentTemplate from "@/models/DocumentTemplate";
import { verifyToken } from "@/lib/auth";

async function requireStaff() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  const user: any = await verifyToken(token);
  if (!user || (user.role !== "admin" && user.role !== "owner")) return null;
  return user;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireStaff();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

    await dbConnect();
    const { id } = await params;
    const template: any = await DocumentTemplate.findById(id).lean();
    if (!template)
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    return NextResponse.json({
      success: true,
      template: { ...template, _id: String(template._id) },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

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
    const body = await req.json();

    const update: any = {};
    for (const field of [
      "name",
      "subject",
      "html",
      "css",
      "design",
      "engine",
      "description",
      "scope",
    ]) {
      if (body[field] !== undefined) update[field] = body[field];
    }

    // Exactly one default per type
    if (body.isDefault === true) {
      const doc: any = await DocumentTemplate.findById(id).lean();
      if (doc) {
        await DocumentTemplate.updateMany(
          { type: doc.type, _id: { $ne: id } },
          { $set: { isDefault: false } },
        );
      }
      update.isDefault = true;
    } else if (body.isDefault === false) {
      update.isDefault = false;
    }

    const template = await DocumentTemplate.findByIdAndUpdate(
      id,
      { $set: update },
      { returnDocument: "after" },
    );
    if (!template)
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true, template });
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
    await DocumentTemplate.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Template deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
