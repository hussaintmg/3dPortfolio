import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export interface ISubscriber extends Document {
  email: string;
  subscribed: boolean;
  token: string;
  source: string;
  lastSentAt: Date | null;
  unsubscribedAt: Date | null;
  createdAt: Date;
}

const SubscriberSchema: Schema = new Schema({
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    // {2,} not {2,3}: .info, .online and .co.uk are all real, and the old
    // bound quietly rejected them at the footer form.
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
      "Please enter a valid email",
    ],
  },
  /**
   * False once they use the unsubscribe link. The row stays: deleting it
   * would let the next footer signup silently re-add someone who opted out.
   */
  subscribed: { type: Boolean, default: true },
  /**
   * Unguessable per-subscriber secret for the unsubscribe link. An
   * unsubscribe URL keyed on the email address alone is a way to unsubscribe
   * strangers.
   */
  token: {
    type: String,
    default: () => crypto.randomBytes(24).toString("hex"),
    index: true,
  },
  /** Where they signed up — "footer" today, room for a landing page later. */
  source: { type: String, default: "footer" },
  lastSentAt: { type: Date, default: null },
  unsubscribedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Subscriber ||
  mongoose.model<ISubscriber>("Subscriber", SubscriberSchema);
