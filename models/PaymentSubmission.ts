import mongoose from "mongoose";

/**
 * A client telling you they've paid. The owner reviews it and either confirms
 * (which marks the invoice paid) or rejects it with a note.
 */
const PaymentSubmissionSchema = new mongoose.Schema(
  {
    invoiceId: { type: String, required: true, index: true },
    invoiceNumber: { type: String, default: "" },
    userId: { type: String, required: true, index: true },
    clientName: { type: String, default: "" },
    clientEmail: { type: String, default: "" },
    method: { type: String, required: true },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    /** Transaction id / trace number the client typed in. */
    reference: { type: String, default: "" },
    note: { type: String, default: "" },
    /** Optional screenshot of the transfer. */
    proofUrl: { type: String, default: "" },
    proofStorageKey: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected"],
      default: "pending",
      index: true,
    },
    reviewNote: { type: String, default: "" },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.models.PaymentSubmission ||
  mongoose.model("PaymentSubmission", PaymentSubmissionSchema);
