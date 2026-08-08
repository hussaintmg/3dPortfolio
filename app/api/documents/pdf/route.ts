import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import dbConnect from "@/lib/mongoose";
import DocumentTemplate from "@/models/DocumentTemplate";
import Invoice from "@/models/Invoice";
import { verifyToken } from "@/lib/auth";
import { designToHtml } from "@/lib/pdfDesigner";
import {
  buildContext,
  renderTemplateHtml,
  wrapDocument,
} from "@/lib/templateEngine";
import { htmlToPdf } from "@/lib/pdf";

/** PDF generation is heavy — give it room. */
export const maxDuration = 60;

/**
 * POST { templateId?, invoiceId } → application/pdf
 *
 * Everything happens server-side: the template is fetched, real data is
 * resolved into it, QR codes are generated, and Chromium prints the result.
 * Clients may only request their own invoice.
 */
export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get("auth_token")?.value;
    if (!token)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const user: any = await verifyToken(token);
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const { templateId, invoiceId } = await req.json();
    const isStaff = user.role === "admin" || user.role === "owner";

    let invoice: any = null;
    if (invoiceId) {
      invoice = await Invoice.findById(invoiceId).lean();
      if (!invoice)
        return NextResponse.json({ success: false, message: "Invoice not found" }, { status: 404 });
      if (!isStaff && invoice.userId !== user.id)
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    } else if (!isStaff) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const tpl: any = templateId
      ? await DocumentTemplate.findById(templateId).lean()
      : await DocumentTemplate.findOne({ type: "pdf", isDefault: true }).lean() ||
        (await DocumentTemplate.findOne({ type: "pdf" }).lean());

    if (!tpl)
      return NextResponse.json(
        { success: false, message: "No PDF template configured" },
        { status: 404 },
      );

    const h = await headers();
    const host = h.get("host") || "localhost:3000";
    const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");

    const context = await buildContext({
      invoiceId,
      baseUrl: `${proto}://${host}`,
    });

    const source =
      tpl.engine === "html" && tpl.html
        ? tpl.html
        : designToHtml(tpl.design, "");

    const rendered = await renderTemplateHtml(source, context);
    const document = wrapDocument(rendered, tpl.css || "");

    const pdf = await htmlToPdf(document, {
      widthPx: tpl.design?.page?.width,
      heightPx: tpl.design?.page?.height,
    });

    const filename = invoice
      ? `${invoice.number}.pdf`
      : `${(tpl.name || "document").replace(/[^a-z0-9]+/gi, "-")}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdf.length),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "PDF generation failed" },
      { status: 500 },
    );
  }
}
