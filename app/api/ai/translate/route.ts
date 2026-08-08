import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { completeWithFallback } from "@/lib/ai/complete";
import {
  buildTranslateMessages,
  buildExplainMessages,
  type TranslateTarget,
} from "@/lib/ai/prompts";

const TARGETS: TranslateTarget[] = ["english", "urdu", "roman-urdu"];

/**
 * POST — translate or explain one chat message.
 *
 * Used two ways: the owner hovering a client's message to understand it, and
 * the composer showing a translation of what he is about to send before it
 * goes out. Both are staff-only; clients have no reason to spend the keys.
 */
export async function POST(req: Request) {
  try {
    const store = await cookies();
    const token = store.get("auth_token")?.value;
    const session: any = token ? await verifyToken(token) : null;
    if (session?.role !== "owner" && session?.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }

    const { text, target = "english", mode = "translate" } = await req.json();

    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { success: false, message: "Nothing to work with" },
        { status: 400 },
      );
    }
    if (text.length > 4000) {
      return NextResponse.json(
        { success: false, message: "That message is too long to process" },
        { status: 400 },
      );
    }
    if (!TARGETS.includes(target)) {
      return NextResponse.json(
        { success: false, message: "Unsupported language" },
        { status: 400 },
      );
    }

    const messages =
      mode === "explain"
        ? buildExplainMessages(text, target)
        : buildTranslateMessages(text, target);

    const result = await completeWithFallback(messages, {
      // Translation should be faithful, not creative
      temperature: mode === "explain" ? 0.4 : 0.1,
      maxTokens: mode === "explain" ? 260 : 600,
      timeoutMs: 20000,
    });

    return NextResponse.json({
      success: true,
      result: result.text,
      mode,
      target,
      provider: result.providerLabel,
      latencyMs: result.latencyMs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 502 },
    );
  }
}
