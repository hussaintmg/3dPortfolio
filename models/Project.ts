import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  technologies: [{ type: String }],
  liveLink: { type: String },
  githubLink: { type: String },
  media: [
    {
      url: { type: String, required: true },
      type: { type: String, enum: ["image", "video"], default: "image" },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Project || mongoose.model("Project", ProjectSchema);
