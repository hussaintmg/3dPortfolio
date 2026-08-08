import dbConnect from "@/lib/mongoose";
import AiSettings from "@/models/AiSettings";
import ChatMessage from "@/models/ChatMessage";
import SiteSettings from "@/models/SiteSettings";
import { completeWithFallback } from "@/lib/ai/complete";
import { buildChatReplyMessages } from "@/lib/ai/prompts";

/**
 * Answers a client in chat while nobody from the studio is watching.
 *
 * Every guard here exists to avoid the two ways this goes wrong: talking over
 * a human who is mid-conversation, and turning into a bot that replies to
 * itself forever. It is called after a client's message is stored and never
 * blocks that request — a failure just means no auto-reply.
 */
export async function maybeAutoReply(conversationId: string): Promise<{
  replied: boolean;
  reason?: string;
  text?: string;
}> {
  await dbConnect();

  const settings: any = await AiSettings.findOne({ key: "global" }).lean();
  if (!settings?.enabled) return { replied: false, reason: "assistant off" };
  if (!settings.chatAutoReply) return { replied: false, reason: "auto-reply off" };

  const now = Date.now();

  // 1. Is a human actually away?
  const seen = settings.staffLastSeenAt
    ? new Date(settings.staffLastSeenAt).getTime()
    : 0;
  const awayMs = (settings.awayAfterMinutes ?? 3) * 60 * 1000;
  if (seen && now - seen < awayMs) {
    return { replied: false, reason: "staff is online" };
  }

  // 2. Read enough of the thread to answer in context
  const recent: any[] = await ChatMessage.find({ conversationId })
    .sort({ createdAt: -1 })
    .limit(16)
    .lean();

  if (recent.length === 0) return { replied: false, reason: "empty thread" };

  const history = [...recent].reverse();
  const last = history[history.length - 1];

  // 3. Only ever answer a client's message, and never our own
  if (last.senderRole !== "user") {
    return { replied: false, reason: "last message was not from the client" };
  }
  if (last.type !== "text" || !last.text?.trim()) {
    return { replied: false, reason: "nothing to read" };
  }

  // 4. A real staff reply anywhere after the last AI message means the human
  //    took over — stand down until they go quiet again.
  const lastAiIndex = history.map((m) => !!m.isAi).lastIndexOf(true);
  const humanRepliedSince = history
    .slice(lastAiIndex + 1)
    .some((m) => m.senderRole !== "user" && !m.isAi);
  if (humanRepliedSince && lastAiIndex !== -1) {
    // fine — a human answered, the assistant may speak again if they go away
  }

  // 5. Don't machine-gun. One reply per minGapSeconds.
  const lastAi = lastAiIndex >= 0 ? history[lastAiIndex] : null;
  if (
    lastAi &&
    now - new Date(lastAi.createdAt).getTime() <
      (settings.minGapSeconds ?? 20) * 1000
  ) {
    return { replied: false, reason: "too soon after the last reply" };
  }

  // 6. Cap how long the assistant can carry a thread on its own
  const aiSinceHuman = countAiSinceLastHuman(history);
  if (aiSinceHuman >= (settings.maxRepliesPerThread ?? 6)) {
    return { replied: false, reason: "reply cap reached for this thread" };
  }

  const site: any = await SiteSettings.findOne({ key: "global" })
    .select("websiteName")
    .lean();
  const ownerName = site?.websiteName || "the studio";

  const messages = await buildChatReplyMessages(
    history
      .filter((m) => m.type === "text" && m.text?.trim())
      .map((m) => ({
        role: m.senderRole === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text as string,
      })),
    ownerName,
  );

  const result = await completeWithFallback(messages, {
    temperature: 0.55,
    // Short on purpose: the brief is a chat reply, not an essay
    maxTokens: 220,
    timeoutMs: 22000,
  });

  const text = tidy(result.text);
  if (!text) return { replied: false, reason: "empty completion" };

  await ChatMessage.create({
    conversationId,
    senderId: "assistant",
    senderName: `${ownerName} Assistant`,
    senderRole: "admin",
    type: "text",
    text,
    isAi: true,
    aiProvider: result.providerLabel,
    readBy: [],
  });

  return { replied: true, text };
}

/** AI messages sent since the last time a human wrote in the thread. */
function countAiSinceLastHuman(history: any[]): number {
  let count = 0;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const m = history[i];
    if (m.senderRole !== "user" && !m.isAi) break; // a human spoke
    if (m.isAi) count += 1;
  }
  return count;
}

/**
 * Models like to wrap replies in quotes or prefix them with a name. Strip the
 * usual tics so it reads like something a person typed into a chat box.
 */
function tidy(text: string): string {
  let out = text.trim();
  out = out.replace(/^```[\s\S]*?\n|```$/g, "").trim();
  out = out.replace(/^["“]([\s\S]+)["”]$/, "$1").trim();
  out = out.replace(/^(assistant|ai|bot)\s*:\s*/i, "").trim();
  // Chat replies should stay short even if the model ignored the brief
  if (out.length > 700) out = `${out.slice(0, 690).trimEnd()}…`;
  return out;
}
