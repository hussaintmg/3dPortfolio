import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import PageSection from "@/models/PageSection";
import SiteContent from "@/models/SiteContent";
import { verifyToken } from "@/lib/auth";
import { getTemplate, SECTION_PAGES } from "@/lib/sectionTemplates";

async function requireOwner() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  const user: any = await verifyToken(token);
  return user?.role === "owner" ? user : null;
}

/** GET ?page=home → sections for that page, in order. */
export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page");
    const filter = page ? { page } : {};
    const sections = await PageSection.find(filter).sort({ order: 1 }).lean();
    return NextResponse.json({
      success: true,
      sections: sections.map((s: any) => ({
        _id: String(s._id),
        page: s.page,
        template: s.template,
        order: s.order,
        visible: s.visible !== false,
        content: s.content || {},
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/** POST { page, template } → creates the section and seeds its default text. */
export async function POST(req: Request) {
  try {
    const user = await requireOwner();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

    await dbConnect();
    const { page, template, order } = await req.json();

    if (!SECTION_PAGES.includes(page))
      return NextResponse.json(
        { success: false, message: "Sections cannot be added to this page" },
        { status: 400 },
      );

    const tpl = getTemplate(template);
    if (!tpl)
      return NextResponse.json(
        { success: false, message: "Unknown template" },
        { status: 400 },
      );

    const last = await PageSection.findOne({ page }).sort({ order: -1 }).lean();
    const nextOrder =
      typeof order === "number" ? order : ((last as any)?.order ?? -1) + 1;

    const section = await PageSection.create({
      page,
      template,
      order: nextOrder,
      visible: true,
      content: tpl.content || {},
    });

    // Seed the template's copy so the new section is never blank
    const ops = Object.entries(tpl.defaults).map(([field, value]) => ({
      updateOne: {
        filter: { key: `section:${section._id}.${field}` },
        update: { $set: { value } },
        upsert: true,
      },
    }));
    if (ops.length) await SiteContent.bulkWrite(ops as any);

    return NextResponse.json({
      success: true,
      section: {
        _id: String(section._id),
        page: section.page,
        template: section.template,
        order: section.order,
        visible: true,
        content: section.content || {},
      },
      message: `${tpl.label} added`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/** PUT { order: [id, id, …] } → persists a new section order for one page. */
export async function PUT(req: Request) {
  try {
    const user = await requireOwner();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

    await dbConnect();
    const { order } = await req.json();
    if (!Array.isArray(order))
      return NextResponse.json(
        { success: false, message: "order must be an array of ids" },
        { status: 400 },
      );

    await PageSection.bulkWrite(
      order.map((id: string, i: number) => ({
        updateOne: { filter: { _id: id }, update: { $set: { order: i } } },
      })) as any,
    );

    return NextResponse.json({ success: true, message: "Order saved" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
