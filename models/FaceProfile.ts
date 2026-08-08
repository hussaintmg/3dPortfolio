import mongoose from "mongoose";

/**
 * Face descriptors enrolled by a user for our own face unlock.
 *
 * A descriptor is 128 floats produced by the recognition model — it cannot be
 * turned back into a photograph, but it identifies a person, so it is treated
 * as personal data: never returned to the client, and deleted with the user.
 *
 * Several samples are kept per person (different angles, glasses on/off,
 * lighting) and a login only has to match the closest one.
 */
const FaceProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /** Each entry is a 128-length descriptor. */
    samples: {
      type: [[Number]],
      default: [],
      validate: {
        validator: (v: number[][]) =>
          v.every((d) => Array.isArray(d) && d.length === 128),
        message: "Every face sample must be a 128-value descriptor",
      },
    },
    label: { type: String, default: "My face" },
    lastUsedAt: { type: Date, default: null },
    /** Consecutive failures — used to lock out brute-force attempts. */
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

FaceProfileSchema.index({ userId: 1 }, { unique: true });

export default mongoose.models.FaceProfile ||
  mongoose.model("FaceProfile", FaceProfileSchema);
