import mongoose from "mongoose";

/**
 * One configured AI endpoint.
 *
 * Several can exist at once — the same provider with different keys counts as
 * several — and they are tried in `order` until one answers, so a rate-limited
 * free tier degrades to the next key instead of failing the whole feature.
 */
const AiProviderSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    kind: {
      type: String,
      enum: ["openrouter", "gemini", "groq", "openai"],
      required: true,
    },
    /** AES-GCM ciphertext — never the raw key, and never sent to the client. */
    apiKey: { type: String, required: true },
    /** Only meaningful for the generic "openai" (OpenAI-compatible) kind. */
    baseUrl: { type: String, default: "" },
    model: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    /** Lower runs first. */
    order: { type: Number, default: 0 },

    /** Result of the last health check, shown next to the key in the UI. */
    lastTest: {
      ok: { type: Boolean, default: null },
      at: { type: Date, default: null },
      message: { type: String, default: "" },
      latencyMs: { type: Number, default: null },
    },

    /** Rolling usage, so a dead key is obvious without opening logs. */
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: null },
    /** Set when a provider fails hard; skipped until this passes. */
    cooldownUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

AiProviderSchema.index({ enabled: 1, order: 1 });

export default mongoose.models.AiProvider ||
  mongoose.model("AiProvider", AiProviderSchema);
