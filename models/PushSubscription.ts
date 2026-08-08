import mongoose from "mongoose";

/**
 * A browser/device registered for Web Push. One user can have several
 * (laptop, phone, installed app), so the endpoint is the unique key.
 */
const PushSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    role: { type: String, default: "user" },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String, default: "" },
    lastSentAt: { type: Date },
    /** Set when the push service reports the endpoint as gone. */
    failedAt: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.models.PushSubscription ||
  mongoose.model("PushSubscription", PushSubscriptionSchema);
