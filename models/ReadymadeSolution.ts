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
    storageKey: { type: String }, // Public key or storage path in Supabase
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.ReadymadeSolution || mongoose.model("ReadymadeSolution", ReadymadeSolutionSchema);
