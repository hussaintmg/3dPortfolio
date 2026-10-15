import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import ChatMessage from "@/models/ChatMessage";
import { raiseNotification } from "@/lib/notifications";
import { maybeAutoReply } from "@/lib/ai/autoReply";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { deleteBlob } from "@/lib/blob";
import { guardRate } from "@/lib/rateLimit";

async function requireUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  const user: any = await verifyToken(token);
  return user || null;
}

const isStaff = (u: any) => u.role === "admin" || u.role === "owner";

/**
 * GET /api/chat
 *  - client: own thread messages
 *  - staff + ?conversationId=X : that thread
 *  - staff (no param): conversation summaries (last message, unread count, user info)
 */
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (isStaff(user) && !conversationId) {
      // Conversation inbox for the dashboard
      const summaries = await ChatMessage.aggregate([
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$conversationId",
            last: { $first: "$$ROOT" },
            unread: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$senderRole", "user"] },
                      { $not: [{ $in: [user.id, { $ifNull: ["$readBy", []] }] }] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { "last.createdAt": -1 } },
        { $limit: 100 },
      ]);

      const ids = summaries.map((s: any) => s._id).filter((id: string) => /^[0-9a-f]{24}$/i.test(id));
      const users = await User.find({ _id: { $in: ids } })
        .select("username displayName email profileImage")
        .lean();
      const userMap = new Map(users.map((u: any) => [String(u._id), u]));

      return NextResponse.json({
        success: true,
        conversations: summaries.map((s: any) => ({
          conversationId: s._id,
          lastMessage: {
            type: s.last.type,
            text: s.last.text,
            senderRole: s.last.senderRole,
            createdAt: s.last.createdAt,
          },
          unread: s.unread,
          user: userMap.get(s._id) || null,
        })),
      });
    }

    // Thread view
    const threadId = isStaff(user) ? conversationId! : user.id;
    const messages = await ChatMessage.find({
      conversationId: threadId,
      deletedFor: { $ne: user.id },
    })
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();

    /**
     * Fetching a thread is the moment we know it reached this person's
     * device — that is what the second tick means. Read state is separate
     * and only set when they actually open the conversation (the PUT below).
     */
    ChatMessage.updateMany(
      {
        conversationId: threadId,
        senderId: { $ne: user.id },
        deliveredTo: { $ne: user.id },
      },
      { $addToSet: { deliveredTo: user.id } },
    ).catch(() => {});

    return NextResponse.json({ success: true, messages, conversationId: threadId });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** POST /api/chat — send a message. Staff must pass conversationId. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    // Flood protection: 30 messages/min per user
    const limited = guardRate(req, "chat-send", 30, 60_000, user.id);
    if (limited) return limited;

    await dbConnect();
    const body = await req.json();
    const { type = "text", text = "", attachment, conversationId, replyTo } = body;

    if (type === "text" && !String(text).trim()) {
      return NextResponse.json(
        { success: false, message: "Message is empty" },
        { status: 400 },
      );
    }
    if (type !== "text" && !attachment?.url) {
      return NextResponse.json(
        { success: false, message: "Attachment missing" },
        { status: 400 },
      );
    }

    const threadId = isStaff(user) ? conversationId : user.id;
    if (!threadId) {
      return NextResponse.json(
        { success: false, message: "conversationId required" },
        { status: 400 },
      );
    }

    const message = await ChatMessage.create({
      conversationId: threadId,
      senderId: user.id,
      senderName: user.username || "User",
      senderRole: user.role,
      type,
      text: String(text).slice(0, 4000),
      attachment: attachment
        ? {
            url: attachment.url,
            name: attachment.name,
            size: attachment.size,
            mime: attachment.mime,
            storageKey: attachment.storageKey,
          }
        : undefined,
      readBy: [user.id],
      deliveredTo: [user.id],
      // A snapshot, so the quote survives the original being deleted
      replyTo: replyTo?.id
        ? {
            id: String(replyTo.id),
            text: String(replyTo.text || "").slice(0, 160),
            senderName: String(replyTo.senderName || "").slice(0, 60),
            type: String(replyTo.type || "text"),
          }
        : undefined,
    });

    // Notify the dashboard when a CLIENT writes (non-blocking)
    let aiReply: any = null;
    if (!isStaff(user)) {
      try {
        await raiseNotification({
          type: "chat",
          title: `New chat message from ${user.username || "a client"}`,
          body: type === "text" ? String(text).slice(0, 120) : `Sent a ${type}`,
          entityId: threadId,
        });
      } catch {}

      // The assistant answers only while nobody from the studio is watching;
      // every guard for that lives in maybeAutoReply. A failure here must
      // never turn into a failed send for the client.
      try {
        const outcome = await maybeAutoReply(threadId!);
        if (outcome.replied) {
          aiReply = await ChatMessage.findOne({
            conversationId: threadId,
            isAi: true,
          })
            .sort({ createdAt: -1 })
            .lean();
        }
      } catch {}
    }

    return NextResponse.json({ success: true, message, aiReply });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** PUT /api/chat — mark a thread read: { conversationId? } */
export async function PUT(req: Request) {
  try {
    const user = await requireUser();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const { conversationId } = await req.json().catch(() => ({}) as any);
    const threadId = isStaff(user) ? conversationId : user.id;
    if (!threadId)
      return NextResponse.json(
        { success: false, message: "conversationId required" },
        { status: 400 },
      );

    await ChatMessage.updateMany(
      { conversationId: threadId, readBy: { $ne: user.id } },
      { $addToSet: { readBy: user.id } },
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/chat?id=<messageId>&mode=me|everyone
 *  - me: hides the message for the requester only
 *  - everyone: permanently removes the message (sender or staff only),
 *    including any uploaded attachment file.
 */
export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const mode = searchParams.get("mode") || "me";

    const message: any = await ChatMessage.findById(id);
    if (!message)
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    // Access: participants only (thread owner or staff)
    const participant = isStaff(user) || message.conversationId === user.id;
    if (!participant)
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    if (mode === "everyone") {
      const canDeleteForEveryone = message.senderId === user.id || isStaff(user);
      if (!canDeleteForEveryone)
        return NextResponse.json(
          { success: false, message: "You can only delete your own messages for everyone" },
          { status: 403 },
        );
      if (message.attachment?.storageKey) {
        await deleteBlob(message.attachment.storageKey);
      }
      await ChatMessage.findByIdAndDelete(id);
      return NextResponse.json({ success: true, message: "Deleted for everyone" });
    }

    await ChatMessage.findByIdAndUpdate(id, {
      $addToSet: { deletedFor: user.id },
    });
    return NextResponse.json({ success: true, message: "Deleted for you" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
