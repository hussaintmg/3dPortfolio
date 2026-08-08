import mongoose, { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    displayName: {
      type: String,
      trim: true,
    },
    profileImage: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["owner", "admin", "user"],
      default: "user",
    },
    /** Profile details the user maintains themselves. */
    avatarUrl: { type: String, default: "" },
    avatarStorageKey: { type: String, default: "" },
    fullName: { type: String, default: "" },
    phone: { type: String, default: "" },
    company: { type: String, default: "" },
    country: { type: String, default: "" },
    bio: { type: String, default: "" },

    /**
     * Email ownership. Unverified accounts still work — locking people out
     * of a portfolio site over an unread email helps nobody — but anything
     * that emails them can check this first.
     */
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date, default: null },
    /** Guards against someone hammering the resend button. */
    verificationSentAt: { type: Date, default: null },

    status: {
      type: String,
      enum: ["pending", "approved", "suspended"],
      default: "approved",
    },
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
    },
    verificationCode: {
      type: String,
      default: null,
    },
    verificationCodeExpiry: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User = models.User || model("User", UserSchema);

export default User;
