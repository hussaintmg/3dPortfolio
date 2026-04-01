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
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Package || mongoose.model("Package", PackageSchema);
