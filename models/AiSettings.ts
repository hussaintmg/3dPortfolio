import mongoose from "mongoose";

/** Singleton (key: "global") holding how the assistant is allowed to behave. */
const AiSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },

    /** Master switch for the whole assistant. */
    enabled: { type: Boolean, default: false },

    /** Reply to clients in chat while nobody is at the dashboard. */
    chatAutoReply: { type: Boolean, default: true },
    /**
     * Minutes of staff silence before the assistant is considered "on duty".
     * Short enough to be useful, long enough not to talk over a live human.
     */
    awayAfterMinutes: { type: Number, default: 3 },
    /** Don't answer the same person more often than this. */
    minGapSeconds: { type: Number, default: 20 },
    /** Stop after this many unanswered AI replies in one thread. */
    maxRepliesPerThread: { type: Number, default: 6 },

    /** Offer translations of incoming messages in the dashboard. */
    translationEnabled: { type: Boolean, default: true },
    defaultTranslateTarget: {
      type: String,
      enum: ["english", "urdu", "roman-urdu"],
      default: "english",
    },

    /** Heartbeat from any staff member looking at the chat screen. */
    staffLastSeenAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.models.AiSettings ||
  mongoose.model("AiSettings", AiSettingsSchema);
