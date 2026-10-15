import mongoose from "mongoose";

const ReadymadeSolutionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  technologies: [{ type: String }],
  colorConfig: {
    type: { type: String, enum: ["solid", "linear", "radial", "conical"], default: "solid" },
    colors: [{ type: String }], // Array of hex/rgb strings
    gradientParams: { type: mongoose.Schema.Types.Mixed }, // For custom gradient settings like angle, etc.
  },
  media: {
    url: { type: String, required: true },
    name: { type: String },
    size: { type: Number },
    type: { type: String },
    storageKey: { type: String }, // Storage path or blob URL
  },
  /**
   * Optional commercial details. A solution with no price is portfolio-only
   * and stays off the packages page; set one and it is offered for sale
   * alongside the hand-built packages.
   */
  price: { type: Number, default: null },
  currency: { type: String, default: "USD" },
  /** "Delivered in 3 days", "one-off", whatever the owner wants to promise. */
  deliveryNote: { type: String, default: "" },
  summary: { type: String, default: "" },
  /** Bullet points shown on the pricing card. */
  features: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.ReadymadeSolution || mongoose.model("ReadymadeSolution", ReadymadeSolutionSchema);
