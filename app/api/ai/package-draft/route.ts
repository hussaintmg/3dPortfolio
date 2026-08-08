import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import ChatMessage from "@/models/ChatMessage";
import { verifyToken } from "@/lib/auth";
import { completeWithFallback } from "@/lib/ai/complete";
import { buildBusinessContext } from "@/lib/ai/prompts";

async function requireStaff() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  const s: any = await verifyToken(token);
  return s?.role === "owner" || s?.role === "admin" ? s : null;
}

/**
 * POST — the assistant drafts a package for a client.
 *
 * It DRAFTS. It does not create, price or send anything: the owner reviews
 * the fields in the composer and presses send himself. Letting a model
 * commit a real price to a real client, unreviewed, is not a feature.
 */
export async function POST(req: Request) {
  try {
    const staff = await requireStaff();
    if (!staff) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 },
      );
    }

    const { userId, brief = "" } = await req.json();
    await dbConnect();

    // The conversation is usually where the requirements actually live
    let history = "";
    if (userId) {
      const msgs: any[] = await ChatMessage.find({
        conversationId: userId,
        type: "text",
      })
        .sort({ createdAt: -1 })
        .limit(25)
        .lean();
      history = msgs
        .reverse()
        .map(
          (m) => `${m.senderRole === "user" ? "Client" : "Me"}: ${m.text}`,
        )
        .join("\n")
        .slice(0, 4000);
    }

    const context = await buildBusinessContext();

    const result = await completeWithFallback(
      [
        {
          role: "system",
          content: `You draft one-off package proposals for a web development studio. The owner reviews everything before it is sent, so be concrete rather than cautious.

Return ONLY a JSON object, no prose and no code fences:
{
  "name": "short package name",
  "description": "2-3 sentences on what it covers",
  "price": <number>,
  "discountedPrice": <number or null>,
  "duration": "e.g. 3 weeks",
  "features": ["specific deliverable", "..."],
  "reasoning": "one short line on how you arrived at the price"
}

Rules:
- Price in USD, a whole number. Anchor it to the existing packages below — a
  bespoke job should sit sensibly against them, not be invented from nothing.
- 4 to 7 features. Each a concrete deliverable, not a slogan.
- If the brief is thin, price the smallest sensible version and say so in
  "reasoning" rather than guessing high.

EXISTING PRICING AND SERVICES
${context}`,
        },
        {
          role: "user",
          content: [
            brief && `What the owner wants: ${brief}`,
            history && `Recent conversation with this client:\n${history}`,
            !brief && !history && "No brief given — propose a sensible starter package.",
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
      { temperature: 0.4, maxTokens: 700, timeoutMs: 30000 },
    );

    // Models still wrap JSON in fences from time to time
    const cleaned = result.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();

    let draft: any;
    try {
      draft = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) {
        return NextResponse.json(
          {
            success: false,
            message: "The model didn't return usable JSON. Try again.",
            raw: cleaned.slice(0, 300),
          },
          { status: 502 },
        );
      }
      draft = JSON.parse(match[0]);
    }

    const price = Number(draft.price);
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { success: false, message: "The draft came back without a usable price." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      draft: {
        name: String(draft.name || "").slice(0, 120),
        description: String(draft.description || "").slice(0, 800),
        price,
        discountedPrice:
          Number.isFinite(Number(draft.discountedPrice)) &&
          Number(draft.discountedPrice) > 0
            ? Number(draft.discountedPrice)
            : null,
        duration: String(draft.duration || "One-off").slice(0, 60),
        features: Array.isArray(draft.features)
          ? draft.features.map((f: unknown) => String(f).slice(0, 140)).slice(0, 10)
          : [],
        reasoning: String(draft.reasoning || "").slice(0, 300),
      },
      provider: result.providerLabel,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 502 },
    );
  }
}
