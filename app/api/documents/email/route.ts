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
  resolveVariables,
} from "@/lib/templateEngine";
import { htmlToPdf } from "@/lib/pdf";
import { sendTemplatedEmail } from "@/lib/email";

export const maxDuration = 60;

/**
 * POST { emailTemplateId, pdfTemplateId?, invoiceId?, to?, attachPdf }
 * Renders the email body with real data and (optionally) attaches a freshly
 * generated PDF. Staff only.
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
    const { emailTemplateId, pdfTemplateId, invoiceId, to, attachPdf } =
      await req.json();

    const emailTpl: any = emailTemplateId
      ? await DocumentTemplate.findById(emailTemplateId).lean()
      : await DocumentTemplate.findOne({ type: "email", isDefault: true }).lean();

    if (!emailTpl)
      return NextResponse.json(
        { success: false, message: "No email template selected" },
        { status: 404 },
      );

    const invoice: any = invoiceId ? await Invoice.findById(invoiceId).lean() : null;
    const recipient = to || invoice?.clientEmail;
    if (!recipient)
      return NextResponse.json(
        { success: false, message: "No recipient — pick a client or type an address" },
        { status: 400 },
      );

    const h = await headers();
    const host = h.get("host") || "localhost:3000";
    const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    const baseUrl = `${proto}://${host}`;

    const context = await buildContext({ invoiceId, baseUrl });

    const bodyHtml = await renderTemplateHtml(emailTpl.html || "", context);
    const subject = await resolveVariables(
      emailTpl.subject || "Message from {{site.name}}",
      context,
    );

    let attachment: { filename: string; content: Buffer } | undefined;
    if (attachPdf) {
      const pdfTpl: any = pdfTemplateId
        ? await DocumentTemplate.findById(pdfTemplateId).lean()
        : await DocumentTemplate.findOne({ type: "pdf", isDefault: true }).lean();

      if (pdfTpl) {
        const source =
          pdfTpl.engine === "html" && pdfTpl.html
            ? pdfTpl.html
            : designToHtml(pdfTpl.design, "");
        const rendered = await renderTemplateHtml(source, context);
        const pdf = await htmlToPdf(wrapDocument(rendered, pdfTpl.css || ""), {
          widthPx: pdfTpl.design?.page?.width,
          heightPx: pdfTpl.design?.page?.height,
        });
        attachment = {
          filename: invoice ? `${invoice.number}.pdf` : "document.pdf",
          content: pdf,
        };
      }
    }

    await sendTemplatedEmail({
      to: recipient,
      subject,
      html: wrapDocument(bodyHtml, emailTpl.css || ""),
      attachment,
    });

    return NextResponse.json({
      success: true,
      message: `Sent to ${recipient}${attachment ? " with PDF attached" : ""}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Could not send" },
      { status: 500 },
    );
  }
}
