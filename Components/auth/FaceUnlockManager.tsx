"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { ScanFace, Trash2, Loader2, ShieldCheck, Plus } from "lucide-react";
import { notify } from "@/lib/notify";
import { Skeleton } from "@/Components/ui/Skeleton";
import ConfirmationModal from "@/Components/dashboard/ConfirmationModal";
import FaceScanner, { type ScanStep } from "./FaceScanner";

const ENROL_STEPS: ScanStep[] = [
  { id: "front", prompt: "Look straight at the camera" },
  { id: "left", prompt: "Turn your head slightly left" },
  { id: "right", prompt: "Turn your head slightly right" },
  { id: "blink", prompt: "Look straight again", requireBlink: true },
];

interface ProfileInfo {
  label: string;
  sampleCount: number;
  createdAt: string;
  lastUsedAt: string | null;
  locked: boolean;
}

/**
 * Set up or remove our own face unlock — the camera-based one, not the
 * device's Face ID / Windows Hello. Sits next to the passkey manager so the
 * two sign-in options are configured in the same place.
 */
export default function FaceUnlockManager() {
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [supported, setSupported] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/auth/face");
      if (data.success) setProfile(data.profile);
    } catch {
      // an empty state is the right fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // getUserMedia is unavailable outside a secure context
    setSupported(
      typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia,
    );
    load();
  }, [load]);

  const enrol = async (samples: number[][]) => {
    const { data } = await axios.post("/api/auth/face", { samples });
    if (!data.success) throw new Error(data.message);
    notify.success("Face unlock is on", "You can now sign in with your face");
    setScanning(false);
    load();
  };

  const remove = async () => {
    try {
      setRemoving(true);
      await axios.delete("/api/auth/face");
      setProfile(null);
      setConfirmOpen(false);
      notify.success("Face unlock removed");
    } catch (err: any) {
      notify.error("Could not remove", err.response?.data?.message || err.message);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-xs font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
            <ScanFace size={14} /> Face Unlock (our own)
          </h2>
          <p className="text-sm text-gray-400 font-medium leading-relaxed max-w-lg">
            Sign in with the camera instead of the device's built-in Face ID or
            Windows Hello. We measure a numeric signature of your face and
            store that — no photo is kept, and it works on any machine with a
            webcam.
          </p>
        </div>

        {!profile && (
          <button
            onClick={() => setScanning(true)}
            disabled={!supported}
            className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={13} /> Set up face unlock
          </button>
        )}
      </div>

      {!supported && (
        <p className="text-xs font-bold text-amber-400">
          The camera isn't available here — face unlock needs https or
          localhost, and a device with a webcam.
        </p>
      )}

      {loading ? (
        <Skeleton className="h-16 w-full rounded-2xl" />
      ) : profile ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-white/8 bg-white/2 px-5 py-4">
          <div className="size-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 shrink-0">
            <ShieldCheck size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white truncate">
              {profile.label}
              {profile.locked && (
                <span className="ml-2 text-[10px] font-black text-amber-400 uppercase">
                  temporarily locked
                </span>
              )}
            </p>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
              {profile.sampleCount} captures · added{" "}
              {new Date(profile.createdAt).toLocaleDateString()}
              {profile.lastUsedAt &&
                ` · last used ${new Date(profile.lastUsedAt).toLocaleDateString()}`}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setScanning(true)}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
            >
              Re-scan
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              className="size-9 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
              aria-label="Remove face unlock"
            >
              {removing ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Trash2 size={15} />
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center space-y-2">
          <ScanFace size={24} className="mx-auto text-gray-700" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Face unlock is off
          </p>
        </div>
      )}

      <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
        Treat this as a convenience, not a vault key: a determined impostor
        with a good photo and video of you can sometimes fool any camera-only
        check. Your password and passkey both still work.
      </p>

      <FaceScanner
        open={scanning}
        onClose={() => setScanning(false)}
        title="Set up face unlock"
        steps={ENROL_STEPS}
        onComplete={enrol}
        busyLabel="Saving your face signature…"
      />

      <ConfirmationModal
        isOpen={confirmOpen}
        title="Remove face unlock?"
        message="Your stored face signature will be deleted. You can set it up again at any time, and your password still works."
        confirmText="Remove"
        cancelText="Keep"
        isLoading={removing}
        onConfirm={remove}
        onClose={() => setConfirmOpen(false)}
        type="danger"
      />
    </section>
  );
}
