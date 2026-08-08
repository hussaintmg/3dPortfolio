import mongoose from "mongoose";

/**
 * Per-element visual overrides set from the on-page style panel.
 * `key` matches the element's editable key (e.g. "home.hero.badge").
 * `styles` is a plain CSS-property object applied as inline styles.
 */
const SiteStyleSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    styles: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export default mongoose.models.SiteStyle ||
  mongoose.model("SiteStyle", SiteStyleSchema);
