import mongoose from "mongoose";

const PackageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  discountedPrice: { type: Number, required: true },
  discountPercent: { type: Number, default: 0 },
  duration: { type: String, required: true },
  features: [{ type: String }],
  media: [
    {
      url: { type: String, required: true },
      type: { type: String, enum: ["image", "video"], default: "image" },
    },
  ],
  isCustom: { type: Boolean, default: false },
  /** Label shown on the card, e.g. "Starter", "Popular", "Best Value". */
  badge: { type: String, default: "" },
  /** Featured packages appear on the home page (top 3 by order). */
  featured: { type: Boolean, default: false },
  /** Sort order — lower comes first. */
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Package || mongoose.model("Package", PackageSchema);
