import mongoose from "mongoose";

/**
 * A section the owner dropped onto a page from the template library.
 * Its text/styles/links/animations live in the normal Site* stores, keyed by
 * `section:<_id>.<field>`, so the whole editor works on them unchanged.
 */
const PageSectionSchema = new mongoose.Schema(
  {
    /** Page slug: "home", "projects", "services", "packages", "contact". */
    page: { type: String, required: true, index: true },
    /** Template id from lib/sectionTemplates.ts */
    template: { type: String, required: true },
    order: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
    /** Template-specific data (image urls, item counts, …). */
    content: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

PageSectionSchema.index({ page: 1, order: 1 });

export default mongoose.models.PageSection ||
  mongoose.model("PageSection", PageSectionSchema);
