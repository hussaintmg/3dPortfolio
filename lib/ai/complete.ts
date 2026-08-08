import dbConnect from "@/lib/mongoose";
import AiProvider from "@/models/AiProvider";
import {
  callProvider,
  toConfig,
  type ChatMessage,
  type CompletionOptions,
} from "@/lib/ai/providers";

/** How long a hard-failing provider sits out before being retried. */
const COOLDOWN_MINUTES = 10;

export interface FallbackResult {
  text: string;
  providerId: string;
  providerLabel: string;
  model: string;
  latencyMs: number;
  /** Providers that were tried and failed first, for the owner's diagnostics. */
  attempts: { label: string; error: string }[];
}

/**
 * Asks each enabled provider in turn until one answers.
 *
 * Free tiers rate-limit constantly, which is exactly why the owner can add
 * several keys: a 429 on the first one should cost a few hundred milliseconds,
 * not the whole feature. A provider that fails is put on a short cooldown so
 * the next request doesn't pay the same timeout again.
 */
export async function completeWithFallback(
  messages: ChatMessage[],
  opts: CompletionOptions = {},
): Promise<FallbackResult> {
  await dbConnect();

  const now = new Date();
  const providers: any[] = await AiProvider.find({ enabled: true })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  if (providers.length === 0) {
    throw new Error(
      "No AI provider is configured. Add one in Dashboard → AI Providers.",
    );
  }

  // Prefer providers not currently cooling down, but fall back to them rather
  // than refusing outright — a stale cooldown shouldn't take the feature down.
  const fresh = providers.filter(
    (p) => !p.cooldownUntil || new Date(p.cooldownUntil) <= now,
  );
  const queue = fresh.length ? fresh : providers;

  const attempts: { label: string; error: string }[] = [];

  for (const doc of queue) {
    const config = toConfig(doc);
    if (!config.apiKey) {
      attempts.push({ label: doc.label, error: "Stored key could not be read" });
      continue;
    }

    try {
      const result = await callProvider(config, messages, opts);

      await AiProvider.updateOne(
        { _id: doc._id },
        {
          $inc: { successCount: 1 },
          $set: { lastUsedAt: new Date(), cooldownUntil: null },
        },
      ).catch(() => {});

      return {
        text: result.text,
        providerId: String(doc._id),
        providerLabel: doc.label,
        model: result.model,
        latencyMs: result.latencyMs,
        attempts,
      };
    } catch (err: any) {
      const message =
        err?.name === "AbortError" ? "Timed out" : err?.message || "Failed";
      attempts.push({ label: doc.label, error: message });

      // Rate limits and rejected keys are worth sitting out; a one-off
      // network blip is not.
      const worthCooling = /Rate limited|Key rejected|unavailable|Timed out/i.test(
        message,
      );
      await AiProvider.updateOne(
        { _id: doc._id },
        {
          $inc: { failureCount: 1 },
          $set: {
            lastUsedAt: new Date(),
            ...(worthCooling
              ? {
                  cooldownUntil: new Date(
                    Date.now() + COOLDOWN_MINUTES * 60 * 1000,
                  ),
                }
              : {}),
          },
        },
      ).catch(() => {});
    }
  }

  throw new Error(
    `Every AI provider failed. ${attempts
      .map((a) => `${a.label}: ${a.error}`)
      .join(" · ")}`,
  );
}

/** True when at least one provider is configured and enabled. */
export async function hasAnyProvider(): Promise<boolean> {
  await dbConnect();
  return (await AiProvider.countDocuments({ enabled: true })) > 0;
}
