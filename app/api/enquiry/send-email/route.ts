import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { webData } from "@/constants/webData";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function POST(req: Request) {
  try {
    const { to, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const mailOptions = {
        from: `"${webData.websiteName} Support" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
            <div style="padding: 20px; border-bottom: 2px solid #6366F1;">
              <h1 style="margin: 0; color: #1a1a2e; font-size: 24px;">${webData.websiteName} Support</h1>
            </div>
            <div style="padding: 30px 20px;">
              ${html}
            </div>
          </div>
        `
      };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true, message: "Email sent successfully" });
  } catch (error: any) {
    console.error("Send email error:", error);
    return NextResponse.json({ success: false, message: "Failed to send email" }, { status: 500 });
  }
}
