"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Fingerprint,
  Plus,
  Trash2,
  Loader2,
  ShieldCheck,
  Smartphone,
  Laptop,
} from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import axios from "axios";
import { notify } from "@/lib/notify";
import { Skeleton } from "@/Components/ui/Skeleton";
import ConfirmationModal from "@/Components/dashboard/ConfirmationModal";

interface PasskeyRow {
  _id: string;
  name: string;
  deviceType: string;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

/**
 * Device manager used in both the client portal and the staff dashboard:
 * enrol this device's fingerprint/face, see registered devices, remove them.
 */
export default function PasskeyManager() {
  const [keys, setKeys] = useState<PasskeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);
  const [platformAvailable, setPlatformAvailable] = useState<boolean | null>(null);
  const [secure, setSecure] = useState(true);
  const [deleting, setDeleting] = useState<PasskeyRow | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/auth/passkey");
      if (data.success) setKeys(data.passkeys || []);
    } catch {
      // list simply stays empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const has =
      typeof window !== "undefined" && !!window.PublicKeyCredential;
    setSupported(has);

    // WebAuthn is blocked outside a secure context — a LAN IP won't work
    setSecure(
      typeof window === "undefined" ||
        window.isSecureContext ||
        location.hostname === "localhost" ||
        location.hostname === "127.0.0.1",
    );

    // Is there actually a fingerprint/face sensor set up on this machine?
    if (has && window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(setPlatformAvailable)
        .catch(() => setPlatformAvailable(false));
    } else {
      setPlatformAvailable(false);
    }

    load();
  }, [load]);

  const addDevice = async (mode: "platform" | "cross" = "platform") => {
    if (!secure) {
      notify.error(
        "Not available on this address",
        "Passkeys need https or localhost. Open the site at localhost instead of the IP.",
      );
      return;
    }
    try {
      setBusy(true);
      const { data: opt } = await axios.get(
        `/api/auth/passkey/register${mode === "cross" ? "?type=cross" : ""}`,
      );
      if (!opt.success) {
        notify.error("Could not start", opt.message);
        return;
      }

      const response = await startRegistration({ optionsJSON: opt.options });
      const guess =
        mode === "cross"
          ? "Security key / phone"
          : /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)
            ? "Phone"
            : "This computer";

      const { data } = await axios.post("/api/auth/passkey/register", {
        response,
        name: guess,
      });

      if (data.success) {
        notify.success("Device registered", "You can now sign in with it");
        load();
      } else {
        notify.error("Registration failed", data.message);
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      if (err?.name === "InvalidStateError") {
        notify.info("Already registered", "This device is set up already");
        return;
      }
      if (err?.name === "NotAllowedError") {
        notify.warning(
          "Cancelled or unavailable",
          "The prompt was dismissed, or Windows Hello isn't set up. Add a PIN/fingerprint in Windows Settings → Accounts → Sign-in options, then try again.",
        );
        return;
      }
      if (err?.name === "NotSupportedError") {
        notify.error(
          "This device can't do it",
          "No built-in fingerprint or face sensor was found. Try 'Use a phone or security key' instead.",
        );
        return;
      }
      notify.error(
        "Registration failed",
        err.response?.data?.message || err.message,
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      setBusy(true);
      await axios.delete(`/api/auth/passkey?id=${deleting._id}`);
      setKeys((prev) => prev.filter((k) => k._id !== deleting._id));
      notify.success("Device removed");
      setDeleting(null);
    } catch (err: any) {
      notify.error("Could not remove", err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-8 space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-xs font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
            <Fingerprint size={14} /> Fingerprint &amp; Face Sign-in
          </h2>
          <p className="text-sm text-gray-400 font-medium leading-relaxed max-w-lg">
            Register this device to sign in with your fingerprint, face or
            device PIN instead of typing a password. Your biometrics never
            leave the device — only a public key is stored.
          </p>
        </div>
        <div className="shrink-0 flex flex-col gap-2">
          <button
            onClick={() => addDevice("platform")}
            disabled={busy || !supported}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Add this device
          </button>
          <button
            onClick={() => addDevice("cross")}
            disabled={busy || !supported}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 text-gray-300 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
          >
            <Smartphone size={12} /> Use phone / key
          </button>
        </div>
      </div>

      {!supported && (
        <p className="text-xs font-bold text-amber-400">
          This browser doesn't support passkeys — try Chrome, Edge or Safari.
        </p>
      )}

      {supported && !secure && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-xs font-black text-amber-400 uppercase tracking-widest">
            Wrong address
          </p>
          <p className="text-[11px] text-gray-300 font-medium mt-1.5 leading-relaxed">
            Passkeys only work on <span className="text-white">https</span> or{" "}
            <span className="text-white">localhost</span>. You're on{" "}
            <code className="text-amber-300">{typeof window !== "undefined" ? location.host : ""}</code>{" "}
            — reopen the site at{" "}
            <code className="text-white">localhost:3000</code> and try again.
          </p>
        </div>
      )}

      {supported && secure && platformAvailable === false && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-xs font-black text-amber-400 uppercase tracking-widest">
            Windows Hello isn't set up
          </p>
          <p className="text-[11px] text-gray-300 font-medium mt-1.5 leading-relaxed">
            This computer has no fingerprint, face or PIN sign-in configured, so
            the browser has nothing to unlock with. Open{" "}
            <span className="text-white">
              Windows Settings → Accounts → Sign-in options
            </span>{" "}
            and add a PIN or fingerprint — a PIN alone is enough. Then reload
            this page. You can also use "Use phone / key" to scan a QR with your
            phone instead.
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center space-y-2">
          <ShieldCheck size={24} className="mx-auto text-gray-700" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            No devices registered yet
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <div
              key={k._id}
              className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/2 px-5 py-4"
            >
              <div className="size-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                {k.name === "Phone" ? <Smartphone size={17} /> : <Laptop size={17} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white truncate">{k.name}</p>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                  Added {new Date(k.createdAt).toLocaleDateString()}
                  {k.lastUsedAt &&
                    ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                  {k.backedUp && " · synced"}
                </p>
              </div>
              <button
                onClick={() => setDeleting(k)}
                className="size-9 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors shrink-0"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleting}
        title="Remove this device?"
        message="You will no longer be able to sign in with it. Your password still works."
        confirmText="Remove"
        cancelText="Keep"
        isLoading={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
        type="danger"
      />
    </section>
  );
}
