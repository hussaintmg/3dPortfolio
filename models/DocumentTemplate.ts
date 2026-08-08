import mongoose from "mongoose";

/**
 * A PDF or email template. It stores BOTH representations:
 *  - `design`: the visual element tree used by the drag-and-drop designer
 *  - `html` / `css`: the code view
 * The two are kept in sync by the editor; `engine` records which one the
 * author edited last so rendering always uses the authoritative copy.
 */
const DocumentTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    /** "pdf" documents get rendered to a file; "email" ones get sent. */
    type: { type: String, enum: ["pdf", "email"], default: "pdf", index: true },
    /** What data this template expects: invoice | client | generic */
    scope: { type: String, default: "invoice" },
    /** Email only. */
    subject: { type: String, default: "" },
    html: { type: String, default: "" },
    css: { type: String, default: "" },
    /** Designer element tree (see lib/pdfDesigner.ts). */
    design: { type: mongoose.Schema.Types.Mixed, default: { elements: [], page: {} } },
    engine: { type: String, enum: ["designer", "html"], default: "designer" },
    /** The template used when nothing specific is chosen. */
    isDefault: { type: Boolean, default: false },
    description: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.models.DocumentTemplate ||
  mongoose.model("DocumentTemplate", DocumentTemplateSchema);
