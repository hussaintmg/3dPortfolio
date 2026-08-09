import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import ChatMessage from "@/models/ChatMessage";
import { verifyToken } from "@/lib/auth";
import { deleteFileFromSupabase } from "@/lib/supabase";

async function requireUser() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  return (await verifyToken(token)) as any;
}

const isStaff = (u: any) => u?.role === "admin" || u?.role === "owner";

/** Only a participant may touch a message. */
const canSee = (user: any, m: any) =>
  isStaff(user) || m.conversationId === user.id;

/**
 * PATCH — the small per-message actions: react, edit, mark a voice note heard.
 *
 * Kept off the main /api/chat route because these are edits to one existing
 * message rather than parts of the send/receive flow, and mixing them made
 * that route's contract hard to reason about.
 */
export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id, action, emoji, text } = await req.json();
    if (!id || !action) {
      return NextResponse.json(
        { success: false, message: "Missing id or action" },
        { status: 400 },
      );
    }

    await dbConnect();
    const message = await ChatMessage.findById(id);
    if (!message || !canSee(user, message)) {
      return NextResponse.json(
        { success: false, message: "Not found" },
        { status: 404 },
      );
    }

    switch (action) {
      case "react": {
        const reaction = String(emoji || "").trim();
        // Keep the payload to one normal emoji/grapheme sequence. This also
        // prevents a forged request from storing an arbitrarily large string.
        if (!reaction || reaction.length > 16) {
          return NextResponse.json(
            { success: false, message: "Choose one valid emoji" },
            { status: 400 },
          );
        }
        const mine = message.reactions.find((r: any) => r.userId === user.id);
        if (mine && mine.emoji === reaction) {
          // Tapping the same one again takes it back
          message.reactions = message.reactions.filter(
            (r: any) => r.userId !== user.id,
          );
        } else if (mine) {
          mine.emoji = reaction;
          mine.at = new Date();
        } else {
          message.reactions.push({ userId: user.id, emoji: reaction, at: new Date() });
        }
        break;
      }

      case "edit": {
        // Only your own words, and only words — an attachment isn't editable
        if (message.senderId !== user.id) {
          return NextResponse.json(
            { success: false, message: "You can only edit your own messages" },
            { status: 403 },
          );
        }
        if (message.type !== "text") {
          return NextResponse.json(
            { success: false, message: "Only text messages can be edited" },
            { status: 400 },
          );
        }
        const next = String(text || "").trim();
        if (!next) {
          return NextResponse.json(
            { success: false, message: "Message would be empty" },
            { status: 400 },
          );
        }
        message.text = next.slice(0, 4000);
        message.editedAt = new Date();
        break;
      }

      case "heard": {
        // A voice note is "heard", not merely "seen" — a separate state
        if (!message.heardBy.includes(user.id)) {
          message.heardBy.push(user.id);
        }
        break;
      }

      default:
        return NextResponse.json(
          { success: false, message: "Unknown action" },
          { status: 400 },
        );
    }

    await message.save();
    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/**
 * POST — delete several messages at once.
 *
 * The single-message delete already exists; this is the multi-select path,
 * and it applies the same permission rule per message rather than trusting
 * the caller's selection.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { ids, mode = "me" } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "Nothing selected" },
        { status: 400 },
      );
    }
    if (ids.length > 200) {
      return NextResponse.json(
        { success: false, message: "Too many at once — select fewer" },
        { status: 400 },
      );
    }

    await dbConnect();
    const messages = await ChatMessage.find({ _id: { $in: ids } });

    let removed = 0;
    let skipped = 0;

    for (const m of messages) {
      if (!canSee(user, m)) {
        skipped += 1;
        continue;
      }

      if (mode === "everyone") {
        // Same rule as the single delete: your own, or staff
        if (m.senderId !== user.id && !isStaff(user)) {
          skipped += 1;
          continue;
        }
        if (m.attachment?.storageKey) {
          await deleteFileFromSupabase(m.attachment.storageKey).catch(() => {});
        }
        await m.deleteOne();
      } else {
        if (!m.deletedFor.includes(user.id)) m.deletedFor.push(user.id);
        await m.save();
      }
      removed += 1;
    }

    return NextResponse.json({ success: true, removed, skipped });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
