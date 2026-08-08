import mongoose from "mongoose";

/**
 * Singleton document (key: "global") holding site-wide branding/metadata,
 * editable from /dashboard/setting.
 */
const SiteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },
    /**
     * When ON: only the owner can browse the site (everyone else is sent to
     * /login), and the owner gets the on-page edit controls.
     */
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: {
      type: String,
      default: "We're putting the finishing touches on something great.",
    },
    websiteName: { type: String, default: "" },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    faviconUrl: { type: String, default: "" },
    faviconStorageKey: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    socials: [
      {
        name: { type: String },
        url: { type: String },
        icon: { type: String },
      },
    ],
    /** Footer "Navigation" column links, managed from /dashboard/cms. */
    footerLinks: [
      {
        name: { type: String },
        url: { type: String },
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.models.SiteSettings ||
  mongoose.model("SiteSettings", SiteSettingsSchema);
