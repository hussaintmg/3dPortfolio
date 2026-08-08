import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import dbConnect from "@/lib/mongoose";
import DocumentTemplate from "@/models/DocumentTemplate";
import { verifyToken } from "@/lib/auth";
import { designToHtml } from "@/lib/pdfDesigner";
import {
  buildContext,
  renderTemplateHtml,
  wrapDocument,
} from "@/lib/templateEngine";

/**
 * Renders a template with REAL data on the server and returns the final HTML.
 * The editor uses this for its live preview, so what you see is exactly what
 * the PDF pipeline will print.
 */
export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const user: any = await verifyToken(token);
    if (!user || (user.role !== "admin" && user.role !== "owner"))
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

    await dbConnect();
    const body = await req.json();
    const { templateId, invoiceId, userId } = body;

    let html = body.html as string | undefined;
    let css = (body.css as string) || "";
    let design = body.design;
    let engine = body.engine || "designer";

    if (templateId && html === undefined) {
      const tpl: any = await DocumentTemplate.findById(templateId).lean();
      if (!tpl)
        return NextResponse.json({ success: false, message: "Template not found" }, { status: 404 });
      html = tpl.html;
      css = tpl.css || "";
      design = tpl.design;
      engine = tpl.engine;
    }

    // The designer is authoritative unless the author last edited raw HTML
    const source =
      engine === "html" && html
        ? html
        : design
          ? designToHtml(design, "")
          : html || "";

    const h = await headers();
    const host = h.get("host") || "localhost:3000";
    const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");

    const context = await buildContext({
      invoiceId,
      userId,
      baseUrl: `${proto}://${host}`,
    });

    const rendered = await renderTemplateHtml(source, context);

    return NextResponse.json({
      success: true,
      html: wrapDocument(rendered, css),
      body: rendered,
      context,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
