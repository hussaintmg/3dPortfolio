import mongoose, { Schema } from "mongoose";

/**
 * A newsletter that was actually sent.
 *
 * Kept mainly so the owner can see what went out and to whom before writing
 * the next one — sending the same offer to the same list twice in a week is
 * the fastest way to earn a spam complaint.
 */
const CampaignSchema = new Schema(
  {
    subject: { type: String, required: true },
    /** The body as the owner wrote it, in plain text/markdown-ish form. */
    body: { type: String, required: true },
    /** Optional call-to-action rendered as a button. */
    ctaLabel: { type: String, default: "" },
    ctaUrl: { type: String, default: "" },
    /** "packages" | "solutions" | "custom" — what the draft was built around. */
    topic: { type: String, default: "custom" },
    /** True when the copy came from the assistant rather than being typed. */
    aiDrafted: { type: Boolean, default: false },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    /** Addresses the mail server rejected, so they can be chased or removed. */
    failures: [{ type: String }],
    sentBy: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.models.Campaign ||
  mongoose.model("Campaign", CampaignSchema);
