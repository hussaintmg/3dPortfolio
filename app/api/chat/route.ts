import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Chat from "@/models/Chat";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) return NextResponse.json({ success: false }, { status: 401 });
    const user: any = await verifyToken(token);
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const otherUserId = searchParams.get("receiverId");

    let query = {};
    if (user.role === "admin" || user.role === "owner") {
      // Admin talking to someone specific
      if (otherUserId) {
        query = {
          $or: [
            { senderId: user.id, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: user.id },
          ],
        };
      } else {
        // Admin just wants their own messages? No, usually admin wants to list all conversations
        // Let's just return nothing if no otherUserId for now
        return NextResponse.json({ success: true, messages: [] });
      }
    } else {
      // Regular user talking to admin. For now, assume admin is fixed as "admin_id" or find any admin
      // Since this is a portfolio, assume they talk to the "owner"
      query = {
        $or: [
          { senderId: user.id, receiverId: "admin" }, // "admin" as a keyword or find actual admin id
          { senderId: "admin", receiverId: user.id },
        ],
      };
    }

    const messages = await Chat.find(query).sort({ createdAt: 1 });
    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) return NextResponse.json({ success: false }, { status: 401 });
    const user: any = await verifyToken(token);
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    const { receiverId, message, packageContext } = await req.json();

    const chat = await Chat.create({
      senderId: user.id,
      receiverId: user.role === "admin" || user.role === "owner" ? receiverId : "admin",
      message,
      packageContext,
    });

    return NextResponse.json({ success: true, chat });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
