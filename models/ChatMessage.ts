import mongoose from "mongoose";

/**
 * One document per message. A conversation is identified by the CLIENT's
 * user id (conversationId) — every client has exactly one thread with the
 * site owner/admins.
 */
const ChatMessageSchema = new mongoose.Schema(
  {
    /** The client user's id — groups the 1:1 thread. */
    conversationId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    senderName: { type: String, default: "" },
    senderRole: {
      type: String,
      enum: ["user", "admin", "owner"],
      default: "user",
    },
    type: {
      type: String,
      enum: ["text", "audio", "image", "video", "file"],
      default: "text",
    },
    text: { type: String, default: "" },
    attachment: {
      url: { type: String },
      name: { type: String },
      size: { type: Number },
      mime: { type: String },
      storageKey: { type: String },
    },
    /**
     * Written by the assistant rather than a person. Shown with a badge so a
     * client is never misled about who they are talking to.
     */
    isAi: { type: Boolean, default: false },
    aiProvider: { type: String, default: "" },
    /** User ids that chose "delete for me" (message hidden for them only). */
    deletedFor: [{ type: String }],
    /**
     * Tick states are derived from these three, in order:
     *   stored           → one tick   (it reached the server)
     *   deliveredTo      → two ticks  (their device has it)
     *   readBy           → two blue   (they opened the thread)
     */
    deliveredTo: [{ type: String }],
    readBy: [{ type: String }],
    /** Voice notes get their own state: played, not merely seen. */
    heardBy: [{ type: String }],

    /** Edited text keeps an "edited" marker rather than pretending. */
    editedAt: { type: Date, default: null },

    /**
     * A snapshot of what is being replied to, not just its id — the original
     * can be deleted, and a quote that vanishes is worse than no quote. The
     * id is kept too so tapping the quote can jump to it.
     */
    replyTo: {
      id: { type: String },
      text: { type: String },
      senderName: { type: String },
      type: { type: String },
    },

    reactions: [
      {
        userId: { type: String, required: true },
        emoji: { type: String, required: true },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

ChatMessageSchema.index({ conversationId: 1, createdAt: 1 });

export default mongoose.models.ChatMessage ||
  mongoose.model("ChatMessage", ChatMessageSchema);
