import mongoose from "mongoose";

/**
 * A WebAuthn credential (Windows Hello, Touch ID, Face ID, Android
 * fingerprint, or a hardware key) registered to one account.
 */
const PasskeySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    /** Base64URL credential id returned by the authenticator. */
    credentialId: { type: String, required: true, unique: true, index: true },
    publicKey: { type: String, required: true },
    counter: { type: Number, default: 0 },
    transports: { type: [String], default: [] },
    deviceType: { type: String, default: "" },
    backedUp: { type: Boolean, default: false },
    /** Friendly name so the user can tell their devices apart. */
    name: { type: String, default: "Passkey" },
    lastUsedAt: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.models.Passkey ||
  mongoose.model("Passkey", PasskeySchema);
