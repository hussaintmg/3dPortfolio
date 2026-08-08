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
    /**
     * The lifecycle, in order:
     *   offered   — the owner built it for this client, nobody has acted yet
     *   requested — the client asked for it (a catalogue package starts here)
     *   approved  — the owner said yes; an invoice exists and payment is open
     *   paid      — the owner confirmed the money arrived
     *   active / completed — delivery states after payment
     *   declined / cancelled — dead ends
     *
     * Payment is only ever possible at `approved`. That is the whole point of
     * the extra states: a client cannot pay for something the owner has not
     * agreed to deliver.
     */
    status: {
      type: String,
      enum: [
        "offered",
        "requested",
        "approved",
        "declined",
        "active",
        "paid",
        "completed",
        "cancelled",
      ],
      default: "offered",
    },
    /** Where it came from — a bespoke build, or the public catalogue. */
    source: { type: String, enum: ["custom", "catalog"], default: "custom" },

    requestedAt: { type: Date, default: null },
    /** Anything the client wanted to say when asking for it. */
    requestNote: { type: String, default: "" },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: String, default: "" },
    declinedAt: { type: Date, default: null },
    declineReason: { type: String, default: "" },
    /** The invoice raised on approval; the client pays against this. */
    invoiceId: { type: String, default: "" },
    invoiceNumber: { type: String, default: "" },

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
