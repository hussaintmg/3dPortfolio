"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  UserRound,
  Save,
  Loader2,
  Lock,
  MailCheck,
  MailWarning,
  Send,
  ShieldCheck,
} from "lucide-react";
import { notify } from "@/lib/notify";
import FloatingInput from "@/Components/ui/FloatingInput";
import FloatingTextarea from "@/Components/ui/FloatingTextarea";
import { Skeleton } from "@/Components/ui/Skeleton";
import ImageCropUpload from "@/Components/ui/ImageCropUpload";

interface Profile {
  _id: string;
  username: string;
  email: string;
  role: string;
  avatarUrl: string;
  fullName: string;
  phone: string;
  company: string;
  country: string;
  bio: string;
  emailVerified: boolean;
  createdAt: string;
}

/**
 * Everything a person can change about their own account.
 *
 * Shared by the staff dashboard and the client portal — the two audiences
 * want exactly the same things, and keeping one component means a fix to
 * either lands in both.
 */
export default function ProfileEditor() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingVerify, setSendingVerify] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [changingPw, setChangingPw] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/profile");
      if (data.success) setProfile(data.profile);
    } catch {
      notify.error("Could not load your profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (patch: Partial<Profile>) =>
    setProfile((p) => (p ? { ...p, ...patch } : p));

  const save = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      const { data } = await axios.put("/api/profile", {
        username: profile.username,
        fullName: profile.fullName,
        phone: profile.phone,
        company: profile.company,
        country: profile.country,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
      });
      if (!data.success) throw new Error(data.message);
      setProfile(data.profile);
      notify.success("Profile saved");
    } catch (err: any) {
      notify.error("Could not save", err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (pw.next !== pw.confirm) {
      notify.error("They don't match", "Retype the new password");
      return;
    }
    try {
      setChangingPw(true);
      const { data } = await axios.patch("/api/profile", {
        currentPassword: pw.current,
        newPassword: pw.next,
      });
      if (!data.success) throw new Error(data.message);
      setPw({ current: "", next: "", confirm: "" });
      notify.success("Password changed");
    } catch (err: any) {
      notify.error(
        "Could not change it",
        err.response?.data?.message || err.message,
      );
    } finally {
      setChangingPw(false);
    }
  };

  const resendVerification = async () => {
    try {
      setSendingVerify(true);
      const { data } = await axios.post("/api/auth/verify-email", {});
      notify.success("Check your inbox", data.message);
    } catch (err: any) {
      notify.error(
        "Could not send",
        err.response?.data?.message || err.message,
      );
    } finally {
      setSendingVerify(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <p className="text-sm text-gray-500 font-medium">
        Your profile couldn't be loaded. Try refreshing.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Identity ────────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-white/10 bg-card p-5 sm:p-8 space-y-6">
        <h2 className="text-xs font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
          <UserRound size={14} /> Your details
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          <div className="shrink-0">
            <ImageCropUpload
              value={profile.avatarUrl}
              onChange={(url) => set({ avatarUrl: url })}
              ratio={1}
              outputSize={256}
              label="Photo"
              hint="Square · shown in chat and on your account"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <FloatingInput
            label="Username"
            value={profile.username}
            onChange={(e) => set({ username: e.target.value })}
          />
          <FloatingInput
            label="Full name"
            value={profile.fullName}
            onChange={(e) => set({ fullName: e.target.value })}
          />
          <FloatingInput
            label="Phone"
            value={profile.phone}
            onChange={(e) => set({ phone: e.target.value })}
          />
          <FloatingInput
            label="Company"
            value={profile.company}
            onChange={(e) => set({ company: e.target.value })}
          />
          <FloatingInput
            label="Country"
            containerClassName="sm:col-span-2"
            value={profile.country}
            onChange={(e) => set({ country: e.target.value })}
          />
        </div>

        <FloatingTextarea
          label="About you"
          rows={3}
          value={profile.bio}
          onChange={(e) => set({ bio: e.target.value })}
        />

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
        >
          {saving ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Save size={13} />
          )}
          Save changes
        </button>
      </section>

      {/* ── Email ───────────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-white/10 bg-card p-5 sm:p-8 space-y-4">
        <h2 className="text-xs font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
          <ShieldCheck size={14} /> Email address
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-white/8 bg-white/2 px-5 py-4">
          <div
            className={`size-10 rounded-xl flex items-center justify-center shrink-0 border ${
              profile.emailVerified
                ? "bg-green-500/10 border-green-500/20 text-green-400"
                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            }`}
          >
            {profile.emailVerified ? (
              <MailCheck size={17} />
            ) : (
              <MailWarning size={17} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white truncate">
              {profile.email}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
              {profile.emailVerified ? "Confirmed" : "Not confirmed yet"}
            </p>
          </div>
          {!profile.emailVerified && (
            <button
              onClick={resendVerification}
              disabled={sendingVerify}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 text-gray-300 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
            >
              {sendingVerify ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Send size={13} />
              )}
              Send link
            </button>
          )}
        </div>

        <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
          Changing the address itself isn't self-service — ask and it'll be
          updated for you, so an account can't be moved to someone else's
          inbox from a hijacked session.
        </p>
      </section>

      {/* ── Password ────────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-white/10 bg-card p-5 sm:p-8 space-y-5">
        <h2 className="text-xs font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
          <Lock size={14} /> Password
        </h2>

        <div className="grid sm:grid-cols-3 gap-4">
          <FloatingInput
            label="Current password"
            type="password"
            value={pw.current}
            onChange={(e) => setPw({ ...pw, current: e.target.value })}
          />
          <FloatingInput
            label="New password"
            type="password"
            value={pw.next}
            onChange={(e) => setPw({ ...pw, next: e.target.value })}
          />
          <FloatingInput
            label="Repeat new password"
            type="password"
            value={pw.confirm}
            onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
          />
        </div>

        {pw.next && pw.next.length < 8 && (
          <p className="text-[11px] font-bold text-amber-400">
            Use at least 8 characters.
          </p>
        )}
        {pw.confirm && pw.next !== pw.confirm && (
          <p className="text-[11px] font-bold text-red-400">
            The two new passwords don't match.
          </p>
        )}

        <button
          onClick={changePassword}
          disabled={
            changingPw ||
            !pw.current ||
            pw.next.length < 8 ||
            pw.next !== pw.confirm
          }
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
        >
          {changingPw ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Lock size={13} />
          )}
          Change password
        </button>
      </section>
    </div>
  );
}
