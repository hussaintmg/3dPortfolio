import mongoose from "mongoose";

/**
 * How clients are allowed to pay. Manual methods just show instructions and
 * collect a reference from the client; hosted methods hand off to a checkout
 * link. Secrets live here but are NEVER returned to the browser.
 */
const MethodSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    /** Shown to the client above the details. */
    instructions: { type: String, default: "" },
    /** Manual/bank fields. */
    accountTitle: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    iban: { type: String, default: "" },
    bankName: { type: String, default: "" },
    branch: { type: String, default: "" },
    swift: { type: String, default: "" },
    /** Wallet / e-mail identified methods (JazzCash, EasyPaisa, Payoneer, Wise). */
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    /** Hosted checkout / request-payment link. */
    paymentLink: { type: String, default: "" },
    currency: { type: String, default: "" },
    /** Paddle only — secret, never sent to the client. */
    vendorId: { type: String, default: "" },
    apiKey: { type: String, default: "" },
    webhookSecret: { type: String, default: "" },
    environment: { type: String, default: "sandbox" },
  },
  { _id: false },
);

const PaymentSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },
    /** Wording shown above the whole pay panel. */
    intro: {
      type: String,
      default:
        "Choose how you'd like to pay. Once you've sent it, let me know below and I'll confirm it.",
    },
    bank: { type: MethodSchema, default: () => ({}) },
    jazzcash: { type: MethodSchema, default: () => ({}) },
    easypaisa: { type: MethodSchema, default: () => ({}) },
    payoneer: { type: MethodSchema, default: () => ({}) },
    wise: { type: MethodSchema, default: () => ({}) },
    paddle: { type: MethodSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export default mongoose.models.PaymentSettings ||
  mongoose.model("PaymentSettings", PaymentSettingsSchema);

/** Method ids in the order they should be offered. */
export const PAYMENT_METHODS = [
  "bank",
  "jazzcash",
  "easypaisa",
  "payoneer",
  "wise",
  "paddle",
] as const;

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number];
