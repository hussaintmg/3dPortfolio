"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Save,
  Loader2,
  Globe,
  Image as ImageIcon,
  Trash2,
  Plus,
  Share2,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Construction,
  PencilLine,
  Link as LinkIcon,
} from "lucide-react";
import axios from "axios";
import { notify } from "@/lib/notify";
import FloatingInput from "@/Components/ui/FloatingInput";
import FloatingTextarea from "@/Components/ui/FloatingTextarea";
import { Skeleton } from "@/Components/ui/Skeleton";
import Toggle from "@/Components/ui/Toggle";
import PasskeyManager from "@/Components/auth/PasskeyManager";
import NotificationSettings from "@/Components/notifications/NotificationSettings";
import { useSite } from "@/context/SiteContext";
import { useAuth } from "@/context/AuthContext";

interface SocialLink {
  name: string;
  url: string;
  icon: string;
}

interface SettingsForm {
  websiteName: string;
  title: string;
  description: string;
  faviconUrl: string;
  faviconStorageKey: string;
  email: string;
  phone: string;
  address: string;
  socials: SocialLink[];
  footerLinks: { name: string; url: string }[];
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

const emptyForm: SettingsForm = {
  websiteName: "",
  title: "",
  description: "",
  faviconUrl: "",
  faviconStorageKey: "",
  email: "",
  phone: "",
  address: "",
  socials: [],
  footerLinks: [],
  maintenanceMode: false,
  maintenanceMessage: "",
};

const SOCIAL_ICONS = ["Github", "Twitter", "Instagram", "Facebook", "Linkedin", "Youtube"];

export default function SiteSettingPage() {
  const { user } = useAuth();
  const { refreshSettings } = useSite();
  const [form, setForm] = useState<SettingsForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState("");
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  useEffect(() => {
    axios
      .get("/api/site-settings")
      .then((res) => {
        if (res.data.success && res.data.settings) {
          const s = res.data.settings;
          setForm({
            websiteName: s.websiteName || "",
            title: s.title || "",
            description: s.description || "",
            faviconUrl: s.faviconUrl || "",
            faviconStorageKey: s.faviconStorageKey || "",
            email: s.email || "",
            phone: s.phone || "",
            address: s.address || "",
            socials: s.socials || [],
            footerLinks: s.footerLinks || [],
            maintenanceMode: !!s.maintenanceMode,
            maintenanceMessage: s.maintenanceMessage || "",
          });
          setFaviconPreview(s.faviconUrl || "");
        }
      })
      .catch(() => notify.error("Could not load settings"))
      .finally(() => setLoading(false));
  }, []);

  const set = (patch: Partial<SettingsForm>) =>
    setForm((f) => ({ ...f, ...patch }));

  const handleFaviconChange = (file: File) => {
    if (!file.type.startsWith("image/")) {
      notify.error("Invalid file", "Favicon must be an image (PNG/ICO/SVG)");
      return;
    }
    setFaviconFile(file);
    setFaviconPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      let faviconUrl = form.faviconUrl;
      let faviconStorageKey = form.faviconStorageKey;

      // Upload new favicon first (through the authenticated server proxy)
      if (faviconFile) {
        setUploadingFavicon(true);
        const fd = new FormData();
        fd.append("file", faviconFile);
        fd.append("folder", "site");
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: fd,
        }).then((r) => r.json());
        setUploadingFavicon(false);

        if (!uploadRes.success) {
          throw new Error(uploadRes.error || "Favicon upload failed");
        }
        faviconUrl = uploadRes.publicUrl;
        faviconStorageKey = uploadRes.filePath;
      }

      const res = await axios.put("/api/site-settings", {
        ...form,
        faviconUrl,
        faviconStorageKey,
        socials: form.socials.filter((s) => s.name.trim() && s.url.trim()),
        footerLinks: form.footerLinks.filter(
          (l) => l.name.trim() && l.url.trim(),
        ),
      });

      if (res.data.success) {
        notify.success("Settings saved", "Branding will update across the site.");
        setForm((f) => ({ ...f, faviconUrl, faviconStorageKey }));
        setFaviconFile(null);
        refreshSettings();
      } else {
        notify.error("Save failed", res.data.message);
      }
    } catch (error: any) {
      notify.error(
        "Save failed",
        error.response?.data?.message || error.message,
      );
    } finally {
      setSaving(false);
      setUploadingFavicon(false);
    }
  };

  if (user && user.role !== "owner") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="size-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400">
          <Settings size={28} />
        </div>
        <h1 className="text-2xl font-black text-white">Owner access only</h1>
        <p className="text-gray-500 font-medium max-w-sm">
          Site settings can only be changed by the owner account.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 sm:p-10 selection:bg-accent/30">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight flex items-center gap-4">
            <div className="size-12 rounded-xl bg-card flex items-center justify-center text-accent border border-white/10 shadow-sm">
              <Settings size={24} />
            </div>
            Site Settings
          </h1>
          <p className="text-gray-400 font-medium text-sm">
            Control your website identity — name, title, favicon, contact info
            and social links.
          </p>
        </header>

        {loading ? (
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-card p-8 space-y-6">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
            <div className="rounded-3xl border border-white/10 bg-card p-8 space-y-6">
              <Skeleton className="h-5 w-40" />
              <div className="flex gap-6">
                <Skeleton className="size-24 rounded-2xl" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-10 w-40 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Maintenance mode — also unlocks on-page editing */}
            <section
              className={`rounded-3xl border p-8 space-y-6 transition-colors ${
                form.maintenanceMode
                  ? "border-amber-500/40 bg-amber-500/5"
                  : "border-white/10 bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-6">
                <div className="space-y-2">
                  <h2
                    className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 ${
                      form.maintenanceMode ? "text-amber-400" : "text-accent"
                    }`}
                  >
                    <Construction size={14} /> Maintenance Mode
                  </h2>
                  <p className="text-sm text-gray-400 font-medium leading-relaxed max-w-lg">
                    While this is ON, visitors are sent to the login page and
                    only <span className="text-white font-bold">you</span> can
                    browse the site. This is also when the on-page{" "}
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 text-white text-[10px] font-bold">
                      <PencilLine size={9} /> Edit Page
                    </span>{" "}
                    button appears so you can rewrite text and restyle
                    elements live.
                  </p>
                </div>

                <Toggle
                  checked={form.maintenanceMode}
                  onChange={(v) => set({ maintenanceMode: v })}
                  tone="amber"
                  aria-label="Maintenance mode"
                />
              </div>

              {form.maintenanceMode && (
                <FloatingTextarea
                  label="Message shown on the login page"
                  rows={2}
                  value={form.maintenanceMessage}
                  onChange={(e) => set({ maintenanceMessage: e.target.value })}
                />
              )}
            </section>

            {/* Biometric sign-in + alerts for this staff account */}
            <PasskeyManager />
            <NotificationSettings />

            {/* Identity */}
            <section className="rounded-3xl border border-white/10 bg-card p-8 space-y-6">
              <h2 className="text-xs font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                <Globe size={14} /> Website Identity
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FloatingInput
                  label="Website Name"
                  value={form.websiteName}
                  onChange={(e) => set({ websiteName: e.target.value })}
                  required
                />
                <FloatingInput
                  label="Browser Tab Title"
                  value={form.title}
                  onChange={(e) => set({ title: e.target.value })}
                />
              </div>
              <FloatingTextarea
                label="Meta Description (SEO)"
                rows={3}
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
              />
            </section>

            {/* Favicon */}
            <section className="rounded-3xl border border-white/10 bg-card p-8 space-y-6">
              <h2 className="text-xs font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                <ImageIcon size={14} /> Favicon
              </h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="size-24 rounded-2xl border border-white/10 bg-[#0A0A0A] flex items-center justify-center overflow-hidden shrink-0">
                  {faviconPreview ? (
                    <img
                      src={faviconPreview}
                      alt="Favicon preview"
                      className="w-12 h-12 object-contain"
                    />
                  ) : (
                    <Sparkles className="text-gray-700" size={28} />
                  )}
                </div>
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 font-medium">
                    Square PNG/ICO/SVG recommended (32×32 or 64×64). Shown in
                    the browser tab.
                  </p>
                  <div className="flex items-center gap-3">
                    <label className="rounded-xl bg-white/5 text-white border border-white/10 px-5 py-2.5 text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2 cursor-pointer w-fit">
                      {uploadingFavicon ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <ImageIcon size={14} />
                      )}
                      {faviconPreview ? "Change Favicon" : "Upload Favicon"}
                      <input
                        type="file"
                        accept="image/*,.ico"
                        className="hidden"
                        onChange={(e) =>
                          e.target.files?.[0] &&
                          handleFaviconChange(e.target.files[0])
                        }
                      />
                    </label>
                    {faviconPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setFaviconFile(null);
                          setFaviconPreview("");
                          set({ faviconUrl: "", faviconStorageKey: "" });
                        }}
                        className="size-10 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                        title="Remove favicon"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Contact */}
            <section className="rounded-3xl border border-white/10 bg-card p-8 space-y-6">
              <h2 className="text-xs font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                <Mail size={14} /> Contact Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FloatingInput
                  label="Public Email"
                  type="email"
                  icon={<Mail size={16} />}
                  value={form.email}
                  onChange={(e) => set({ email: e.target.value })}
                />
                <FloatingInput
                  label="Phone"
                  icon={<Phone size={16} />}
                  value={form.phone}
                  onChange={(e) => set({ phone: e.target.value })}
                />
              </div>
              <FloatingInput
                label="Address / Location"
                icon={<MapPin size={16} />}
                value={form.address}
                onChange={(e) => set({ address: e.target.value })}
              />
            </section>

            {/* Footer navigation links */}
            <section className="rounded-3xl border border-white/10 bg-card p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                  <LinkIcon size={14} /> Footer Links
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    set({
                      footerLinks: [...form.footerLinks, { name: "", url: "" }],
                    })
                  }
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 text-accent border border-accent/20 text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-all"
                >
                  <Plus size={13} /> Add Link
                </button>
              </div>

              {form.footerLinks.length === 0 && (
                <p className="text-gray-600 text-xs italic">
                  No custom footer links — the site navigation is used instead.
                </p>
              )}

              <div className="space-y-4">
                {form.footerLinks.map((link, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_44px] gap-3 items-center"
                  >
                    <FloatingInput
                      label="Label"
                      value={link.name}
                      onChange={(e) => {
                        const footerLinks = [...form.footerLinks];
                        footerLinks[i] = { ...footerLinks[i], name: e.target.value };
                        set({ footerLinks });
                      }}
                    />
                    <FloatingInput
                      label="URL (e.g. /projects or https://…)"
                      value={link.url}
                      onChange={(e) => {
                        const footerLinks = [...form.footerLinks];
                        footerLinks[i] = { ...footerLinks[i], url: e.target.value };
                        set({ footerLinks });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        set({
                          footerLinks: form.footerLinks.filter(
                            (_, idx) => idx !== i,
                          ),
                        })
                      }
                      className="size-11 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Socials */}
            <section className="rounded-3xl border border-white/10 bg-card p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                  <Share2 size={14} /> Social Links
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    set({
                      socials: [
                        ...form.socials,
                        { name: "", url: "", icon: "Github" },
                      ],
                    })
                  }
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 text-accent border border-accent/20 text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-all"
                >
                  <Plus size={13} /> Add Link
                </button>
              </div>

              {form.socials.length === 0 && (
                <p className="text-gray-600 text-xs italic">
                  No social links yet — add your GitHub, LinkedIn, etc.
                </p>
              )}

              <div className="space-y-4">
                {form.socials.map((social, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_130px_44px] gap-3 items-center"
                  >
                    <FloatingInput
                      label="Name"
                      value={social.name}
                      onChange={(e) => {
                        const socials = [...form.socials];
                        socials[i] = { ...socials[i], name: e.target.value };
                        set({ socials });
                      }}
                    />
                    <FloatingInput
                      label="URL"
                      type="url"
                      value={social.url}
                      onChange={(e) => {
                        const socials = [...form.socials];
                        socials[i] = { ...socials[i], url: e.target.value };
                        set({ socials });
                      }}
                    />
                    <select
                      value={social.icon}
                      onChange={(e) => {
                        const socials = [...form.socials];
                        socials[i] = { ...socials[i], icon: e.target.value };
                        set({ socials });
                      }}
                      className="h-14 bg-white/5 border border-white/10 rounded-2xl px-3 text-white text-sm outline-none focus:border-accent transition-all cursor-pointer"
                    >
                      {SOCIAL_ICONS.map((ic) => (
                        <option key={ic} value={ic} className="bg-[#111827]">
                          {ic}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        set({
                          socials: form.socials.filter((_, idx) => idx !== i),
                        })
                      }
                      className="size-11 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 py-4.5 rounded-2xl font-black text-xs text-white uppercase tracking-widest transition-all shadow-lg shadow-accent/20 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  {uploadingFavicon ? "Uploading favicon..." : "Saving..."}
                </>
              ) : (
                <>
                  <Save size={16} /> Save Settings
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
