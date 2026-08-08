import mongoose from "mongoose";

/**
 * A package handed to a specific client. Custom (per-client) packages are
 * assigned here too — `paid` locks it so the client cannot pay twice.
 */
const PackageAssignmentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    packageId: { type: String, required: true },
    packageName: { type: String, default: "" },
    price: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      enum: ["offered", "active", "paid", "completed", "cancelled"],
      default: "offered",
    },
    /** Once true the client can never be charged for this assignment again. */
    paid: { type: Boolean, default: false },
    paidAt: { type: Date },
    /** Optional project link + notes shown in the client portal. */
    projectUrl: { type: String, default: "" },
    notes: { type: String, default: "" },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.models.PackageAssignment ||
  mongoose.model("PackageAssignment", PackageAssignmentSchema);
