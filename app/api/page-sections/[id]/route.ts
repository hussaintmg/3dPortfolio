import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import PageSection from "@/models/PageSection";
import SiteContent from "@/models/SiteContent";
import SiteStyle from "@/models/SiteStyle";
import SiteLink from "@/models/SiteLink";
import SiteAnimation from "@/models/SiteAnimation";
import { verifyToken } from "@/lib/auth";

async function requireOwner() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  const user: any = await verifyToken(token);
  return user?.role === "owner" ? user : null;
}

/** PATCH — visibility, order or template content (image urls, layout flags). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireOwner();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

    await dbConnect();
    const { id } = await params;
    const { visible, order, content } = await req.json();

    const update: any = {};
    if (visible !== undefined) update.visible = !!visible;
    if (order !== undefined) update.order = Number(order);
    if (content !== undefined && typeof content === "object")
      update.content = content;

    const section = await PageSection.findByIdAndUpdate(
      id,
      { $set: update },
      { returnDocument: "after" },
    );
    if (!section)
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true, section });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/** DELETE — removes the section and every editor record keyed to it. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireOwner();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

    await dbConnect();
    const { id } = await params;

    const keyPrefix = new RegExp(`^section:${id}\\.`);
    await Promise.all([
      PageSection.findByIdAndDelete(id),
      SiteContent.deleteMany({ key: keyPrefix }),
      SiteStyle.deleteMany({ key: keyPrefix }),
      SiteLink.deleteMany({ key: keyPrefix }),
      SiteAnimation.deleteMany({ key: keyPrefix }),
    ]);

    return NextResponse.json({ success: true, message: "Section removed" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
