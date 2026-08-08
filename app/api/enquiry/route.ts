import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Enquiry from "@/models/Enquiry";
import { sendEnquiryEmail } from "@/lib/email";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { getUserById } from "@/lib/userHelper";
import { guardRate } from "@/lib/rateLimit";
import { raiseNotification } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    // Spam protection: 5 enquiries/hour per IP
    const limited = guardRate(req, "enquiry", 5, 60 * 60_000);
    if (limited) return limited;

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

    // In-app dashboard notification (non-blocking)
    try {
      await raiseNotification({
        type: "enquiry",
        title: `New enquiry from ${name}`,
        body: String(message || "").slice(0, 120),
        link: "/dashboard/enquiries",
      });
    } catch {}

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
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token) as any;
    if (!payload || !payload.id) {
        return NextResponse.json({ success: false, message: "Invalid session" }, { status: 401 });
    }

    const user = await getUserById(payload.id);
    if (!user) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Allow only owner or approved admin
    const isOwner = user.role === "owner";
    const isApprovedAdmin = user.role === "admin" && user.status === "approved";

    if (!isOwner && !isApprovedAdmin) {
       return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    await dbConnect();
    const enquiries = await Enquiry.find().sort({ createdAt: -1 });
    return NextResponse.json({ success: true, enquiries }, { status: 200 });
  } catch (error: any) {
    console.error("Enquiry GET error:", error);
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
}
