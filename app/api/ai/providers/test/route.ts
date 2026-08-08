import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/mongoose";
import AiProvider from "@/models/AiProvider";
import { verifyToken } from "@/lib/auth";
import { callProvider, toConfig } from "@/lib/ai/providers";

async function requireOwner() {
  const store = await cookies();
  const token = store.get("auth_token")?.value;
  if (!token) return null;
  const session: any = await verifyToken(token);
  return session?.role === "owner" ? session : null;
}

/**
 * POST — send one tiny prompt through a provider to prove the key works.
 *
 * A key that looks right but is out of credit, restricted to another model,
 * or simply mistyped is indistinguishable until you actually call it. The
 * result is stored so the list can show which keys are live.
 */
export async function POST(req: Request) {
  try {
    if (!(await requireOwner())) {
      return NextResponse.json(
        { success: false, message: "Only the owner can test providers" },
        { status: 403 },
      );
    }

    const { id, all } = await req.json();
    await dbConnect();

    const docs: any[] = all
      ? await AiProvider.find().sort({ order: 1 })
      : await AiProvider.find({ _id: id });

    if (docs.length === 0) {
      return NextResponse.json(
        { success: false, message: "Provider not found" },
        { status: 404 },
      );
    }

    const results = [];
    for (const doc of docs) {
      const started = Date.now();
      try {
        const out = await callProvider(
          toConfig(doc),
          [
            {
              role: "user",
              content: "Reply with the single word: ready",
            },
          ],
          { maxTokens: 12, temperature: 0, timeoutMs: 20000 },
        );

        doc.lastTest = {
          ok: true,
          at: new Date(),
          message: out.text.slice(0, 80),
          latencyMs: out.latencyMs,
        };
        doc.cooldownUntil = null;
        await doc.save();

        results.push({
          id: String(doc._id),
          label: doc.label,
          ok: true,
          latencyMs: out.latencyMs,
          reply: out.text.slice(0, 80),
        });
      } catch (err: any) {
        const message =
          err?.name === "AbortError" ? "Timed out" : err?.message || "Failed";
        doc.lastTest = {
          ok: false,
          at: new Date(),
          message: message.slice(0, 200),
          latencyMs: Date.now() - started,
        };
        await doc.save();

        results.push({
          id: String(doc._id),
          label: doc.label,
          ok: false,
          error: message.slice(0, 200),
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      working: results.filter((r) => r.ok).length,
      total: results.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
