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
    /**
     * Square app icon used by the installed PWA and by push notifications.
     * Stored separately from the favicon: the favicon is a tiny 32px mark,
     * this one has to hold up at 512px on a home screen.
     */
    appIconUrl: { type: String, default: "" },
    appIconStorageKey: { type: String, default: "" },
    /** Colours the OS uses for the splash screen and title bar. */
    themeColor: { type: String, default: "#0083fe" },
    backgroundColor: { type: String, default: "#0b0f19" },
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
    /**
     * Search-console ownership proofs.
     *
     * These deliberately live in the database rather than only in environment
     * variables. Google hands you a code and expects to find it within
     * minutes; if the only way to publish it is a Vercel env var plus a
     * redeploy, verification stalls on a deploy the owner may not be able to
     * run. Saved here they are live on the next page render.
     *
     * `googleVerification`  — the `content="…"` value from the HTML-tag method
     * `googleVerificationFile` — the `googleXXXX.html` filename, if the
     *                            file method was chosen instead
     * `bingVerification`    — Bing's `msvalidate.01` value
     */
    googleVerification: { type: String, default: "" },
    googleVerificationFile: { type: String, default: "" },
    bingVerification: { type: String, default: "" },
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
