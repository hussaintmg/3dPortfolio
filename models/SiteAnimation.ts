import mongoose from "mongoose";

/**
 * Per-element entrance animation chosen from the editor's Motion tab.
 * `key` matches the element's editable key.
 */
const SiteAnimationSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    /** One of the presets in lib/animations.ts */
    type: { type: String, default: "fade-up" },
    duration: { type: Number, default: 700 },
    delay: { type: Number, default: 0 },
    easing: { type: String, default: "smooth" },
    /** Replay every time it scrolls into view, or only once. */
    once: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.models.SiteAnimation ||
  mongoose.model("SiteAnimation", SiteAnimationSchema);
