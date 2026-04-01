import mongoose from "mongoose";

const ServiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true }, // Store icon name (Lucide icon name)
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Service || mongoose.model("Service", ServiceSchema);
