import mongoose from "mongoose";

/**
 * Per-element link override set from the on-page editor's Link tab.
 * `key` matches the element's editable key. When `enabled` is true the
 * element renders as a real anchor pointing at `href`.
 */
const SiteLinkSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    href: { type: String, default: "" },
    newTab: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.models.SiteLink ||
  mongoose.model("SiteLink", SiteLinkSchema);
