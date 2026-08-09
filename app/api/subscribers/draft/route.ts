import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import Package from "@/models/Package";
import ReadymadeSolution from "@/models/ReadymadeSolution";
import { verifyToken } from "@/lib/auth";
import { completeWithFallback } from "@/lib/ai/complete";
import { buildBusinessContext } from "@/lib/ai/prompts";
import { SITE_URL } from "@/lib/seo";

async function requireStaff() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  const s: any = await verifyToken(token);
  return s?.role === "owner" || s?.role === "admin" ? s : null;
}

interface Draft {
  subject: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}

/**
 * Turn whatever the model said into something editable.
 *
 * Free-tier models routinely ignore "reply with JSON only" — they wrap it in
 * a fence, or preface it with "Sure! Here's the email:", or just write the
 * email. Refusing all of that and showing an error means the owner sees a
 * failure where perfectly usable copy was actually produced, so the plain
 * prose path is a real fallback, not a nicety.
 */
function parseDraft(text: string): Draft | null {
  const raw = stripReasoning(text);

  const open = raw.indexOf("{");
  const close = raw.lastIndexOf("}");
  if (open !== -1 && close > open) {
    try {
      const o = JSON.parse(raw.slice(open, close + 1));
      if (o.subject || o.body) {
        return {
          subject: String(o.subject || "").trim(),
          body: String(o.body || "").trim(),
          ctaLabel: String(o.ctaLabel || "").trim(),
          ctaUrl: String(o.ctaUrl || "").trim(),
        };
      }
    } catch {
      // fall through to the prose reading below
    }
  }

  /**
   * Reasoning models leak their scratchpad into the answer.
   *
   * "We need to craft a subject line. Let's count the words." is not a
   * newsletter, and treating it as prose would put it straight into the
   * composer. Better to report failure and let the caller ask again.
   */
  if (looksLikeReasoning(raw)) return null;

  // Prose: an explicit "Subject:" line if there is one, else the first line
  const lines = raw.split(/\r?\n/);
  const labelled = lines.findIndex((l) => /^\s*subject\s*:/i.test(l));
  const idx = labelled === -1 ? lines.findIndex((l) => l.trim()) : labelled;

  const subject = (lines[idx] || "Update")
    .replace(/^\s*subject\s*:/i, "")
    .replace(/^#+\s*/, "")
    .replace(/^\*+|\*+$/g, "")
    .trim();

  const body = lines
    .slice(idx + 1)
    .join("\n")
    .replace(/^\s*body\s*:/i, "")
    .trim();

  return { subject, body: body || raw, ctaLabel: "", ctaUrl: "" };
}

/** Drops `<think>` blocks and code fences before anything else looks at it. */
function stripReasoning(text: string) {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .trim()
    .replace(/^```(?:json)?\s*|\s*```$/g, "")
    .trim();
}

/** Tell-tale first-person planning language, which no email ever contains. */
function looksLikeReasoning(text: string) {
  return /\b(we need to|let's (draft|count|craft)|i should|now body|word count|the user (wants|asked))\b/i.test(
    text.slice(0, 800),
  );
}

/**
 * POST — the assistant drafts a newsletter.
 *
 * It DRAFTS. Nothing is sent from here: the owner reads the subject and body
 * in the composer and presses send. A model that can mail a real list
 * unreviewed is a liability, not a feature.
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

    const { topic = "packages", brief = "" } = await req.json();
    await dbConnect();

    // Give the model the real catalogue so it can't invent a price
    let catalogue = "";
    if (topic === "packages") {
      const pkgs: any[] = await Package.find({ isCustom: { $ne: true } })
        .sort({ price: 1 })
        .limit(8)
        .lean();
      catalogue = pkgs
        .map(
          (p) =>
            `- ${p.name}: ${p.discountPercent > 0 ? p.discountedPrice : p.price} USD, ${
              p.duration || "flexible"
            }. ${p.description || ""} Features: ${(p.features || [])
              .slice(0, 6)
              .join("; ")}`,
        )
        .join("\n");
    } else if (topic === "solutions") {
      const sols: any[] = await ReadymadeSolution.find().limit(8).lean();
      catalogue = sols
        .map((s) => `- ${s.title || s.name}: ${s.description || ""}`)
        .join("\n");
    }

    const context = await buildBusinessContext();

    const messages: any[] = [
        {
          role: "system",
          content: [
            "You write short marketing emails for a solo web developer's newsletter.",
            "",
            "Rules, all of them hard:",
            "- Never invent a price, a delivery time or a feature. Only use what the catalogue below states. If it is not listed, do not mention it.",
            "- Plain text only. No HTML, no markdown headings, no emoji.",
            "- 120–200 words in the body. Short paragraphs separated by a blank line. Bullets start with '- '.",
            "- Write like one person emailing another. No 'Dear valued subscriber', no hype, no exclamation marks.",
            "- Do not write a subscribe or unsubscribe footer; the system adds one.",
            "",
            /**
             * Plain text, not JSON.
             *
             * Asking a small free model for strict JSON made it spend its
             * whole budget reasoning about the schema and never reach the
             * email. "Subject: …" then the body is a format any model can
             * hit first time, and it parses just as reliably.
             */
            "Format — exactly this, nothing before or after:",
            "Subject: <one line>",
            "<blank line>",
            "<the email body>",
            "",
            "Start your reply with the word Subject. Do not explain yourself.",
            "",
            "Business context:",
            context,
            catalogue ? `\nCatalogue (the only facts you may state):\n${catalogue}` : "",
          ].join("\n"),
        },
        {
          role: "user",
          content:
            brief.trim() ||
            (topic === "solutions"
              ? "Write a newsletter about the ready-made solutions available right now."
              : topic === "packages"
                ? "Write a newsletter introducing the current packages."
                : "Write a short update newsletter for the list."),
        },
    ];

    /**
     * Generous token budget.
     *
     * A reasoning model spends hundreds of tokens planning before it writes
     * anything, and a 900-token ceiling cut it off mid-thought every time —
     * so the JSON it was about to produce never arrived and this looked like
     * a parsing failure rather than a truncation.
     */
    const result = await completeWithFallback(messages, {
      temperature: 0.7,
      maxTokens: 3000,
      timeoutMs: 60000,
    });

    let draft = parseDraft(result.text);

    /**
     * One repair attempt.
     *
     * Reasoning models answer the first turn with their scratchpad. Handing
     * that back and asking only for the JSON almost always works, and one
     * extra call is far better than telling the owner to "try again" when
     * the copy was already written.
     */
    if (!draft) {
      const repaired = await completeWithFallback(
        [
          ...messages,
          { role: "assistant", content: result.text.slice(0, 4000) },
          {
            role: "user",
            content:
              "That was your working, not the email. Reply now with the email only: first line 'Subject: ...', then a blank line, then the body. Nothing else.",
          },
        ],
        { temperature: 0.2, maxTokens: 3000, timeoutMs: 60000 },
      );
      draft = parseDraft(repaired.text);
    }

    if (!draft) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The model kept replying with its working instead of the email. Try a different provider in Dashboard → AI Providers.",
          // Showing what it actually said is what lets the owner tell a
          // reasoning model apart from a rate limit or a bad key
          reply: result.text.slice(0, 400),
          provider: result.providerLabel,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      draft: {
        subject: draft.subject.slice(0, 160),
        body: draft.body,
        ctaLabel: (draft.ctaLabel || "See the packages").slice(0, 40),
        ctaUrl: draft.ctaUrl || `${SITE_URL}/packages`,
      },
      provider: result.providerLabel,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
