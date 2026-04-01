import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Enquiry from "@/models/Enquiry";
import { sendEnquiryEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ success: false, message: "Required fields missing" }, { status: 400 });
    }

    // Basic sanitize (strip potentially harmful HTML just to be sure)
    const sanitizedEmail = email.toLowerCase().trim();
    if (!sanitizedEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return NextResponse.json({ success: false, message: "Invalid email" }, { status: 400 });
    }

    const enquiry = await Enquiry.create({
      name,
      email: sanitizedEmail,
      message,
    });

    // Email Notification
    try {
        await sendEnquiryEmail(name, email, message);
    } catch (e) {
        console.error("Email notification failed, but enquiry was saved.");
    }

    return NextResponse.json({
      success: true,
      message: "Enquiry sent successfully!",
      id: enquiry._id,
    }, { status: 200 });
  } catch (error: any) {
    console.error("Enquiry API error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await dbConnect();
    const enquiries = await Enquiry.find().sort({ createdAt: -1 });
    return NextResponse.json({ success: true, enquiries }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: "Error fetching enquiries" }, { status: 500 });
  }
}
