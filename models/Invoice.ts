import mongoose from "mongoose";

/**
 * Client invoice. Created by the owner from the dashboard, visible to the
 * client in their portal (with PDF download).
 */
const InvoiceSchema = new mongoose.Schema(
  {
    /** Sequential human-readable number, e.g. INV-0007 */
    number: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    clientName: { type: String, default: "" },
    clientEmail: { type: String, default: "" },
    packageId: { type: String, default: "" },
    packageName: { type: String, default: "" },
    items: [
      {
        description: { type: String },
        quantity: { type: Number, default: 1 },
        unitPrice: { type: Number, default: 0 },
      },
    ],
    currency: { type: String, default: "USD" },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "unpaid", "paid", "overdue", "cancelled"],
      default: "unpaid",
      index: true,
    },
    /** How it was settled — manual bank/JazzCash/EasyPaisa/other for now. */
    paymentMethod: { type: String, default: "" },
    paymentReference: { type: String, default: "" },
    notes: { type: String, default: "" },
    issuedAt: { type: Date, default: Date.now },
    dueDate: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.models.Invoice ||
  mongoose.model("Invoice", InvoiceSchema);
