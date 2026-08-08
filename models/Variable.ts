import mongoose from "mongoose";

/**
 * A named placeholder usable in PDF/email templates as {{key}}.
 * `path` is a dot-path into the render context the backend builds from real
 * database records (invoice, client, package, site), so nothing is hardcoded
 * into a template.
 */
const VariableSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    label: { type: String, default: "" },
    group: { type: String, default: "General", index: true },
    /** e.g. "invoice.total" or "client.displayName" */
    path: { type: String, default: "" },
    /** Shown in the palette and used when previewing without real data. */
    sample: { type: String, default: "" },
    fallback: { type: String, default: "" },
    description: { type: String, default: "" },
    /** Built-ins cannot be deleted, only edited. */
    system: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.models.Variable ||
  mongoose.model("Variable", VariableSchema);
