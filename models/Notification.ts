import mongoose from "mongoose";

/**
 * In-app notifications for the dashboard (owner/admin).
 * Created automatically on new enquiries/subscribers — chat & payment
 * events will plug in here next.
 */
const NotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["enquiry", "subscriber", "chat", "payment", "system"],
      default: "system",
    },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    /** Dashboard path to open when clicked, e.g. /dashboard/enquiries */
    link: { type: String, default: "" },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
