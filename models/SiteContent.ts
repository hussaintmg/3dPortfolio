import mongoose from "mongoose";

/**
 * Inline-editable text blocks. `key` is "<page>.<section>.<field>"
 * (e.g. "home.hero.heading"). The public site renders the stored value,
 * falling back to the hardcoded default when a key is missing.
 */
const SiteContentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.models.SiteContent ||
  mongoose.model("SiteContent", SiteContentSchema);
