"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, Loader2 } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import axios from "axios";
import { notify } from "@/lib/notify";

/**
 * "Sign in with fingerprint / face" — one tap, no password. Renders only when
 * the browser actually supports WebAuthn.
 */
/** WebAuthn only runs on https or localhost — a LAN IP silently fails. */
const isSecureOrigin = () =>
  typeof window === "undefined" ||
  window.isSecureContext ||
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1";

export default function PasskeyButton({
  /** Optional email/username so we can look up this user's credentials. */
  identifier,
}: {
  identifier?: string;
}) {
  const router = useRouter();
  const [supported, setSupported] = useState(false);
  const [insecure, setInsecure] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      !!window.PublicKeyCredential &&
      !!navigator.credentials;
    setSupported(ok);
    setInsecure(!isSecureOrigin());
  }, []);

  if (!supported) return null;

  const signIn = async () => {
    if (insecure) {
      notify.error(
        "Not available on this address",
        "Fingerprint sign-in needs https or localhost. Open the site at localhost instead of the IP.",
      );
      return;
    }

    try {
      setBusy(true);
      const query = identifier
        ? `?identifier=${encodeURIComponent(identifier)}`
        : "";
      const { data: opt } = await axios.get(
        `/api/auth/passkey/authenticate${query}`,
      );
      if (!opt.success) {
        notify.error("Could not start", opt.message);
        return;
      }

      const response = await startAuthentication({ optionsJSON: opt.options });
      const { data } = await axios.post("/api/auth/passkey/authenticate", {
        response,
      });

      if (data.success) {
        notify.success("Welcome back", "Signed in with your device");
        router.push(data.user?.role === "user" ? "/portal" : "/dashboard");
        router.refresh();
      } else {
        notify.error("Sign-in failed", data.message);
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      if (err?.name === "NotAllowedError") {
        // Either the user dismissed it, or no matching passkey was offered
        notify.warning(
          "No passkey used",
          "Cancelled, or this device has no passkey for this site yet. Sign in with your password once, then add the device from Settings.",
        );
        return;
      }
      notify.error(
        "Sign-in failed",
        err.response?.data?.message || err.message || "Please try again",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-600">
          or
        </span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      {insecure && (
        <p className="text-[10px] font-bold text-amber-400 leading-relaxed text-center">
          Fingerprint sign-in needs https or localhost — open the site at
          <span className="text-white"> localhost</span>, not an IP address.
        </p>
      )}

      <button
        type="button"
        onClick={signIn}
        disabled={busy}
        className="w-full group flex items-center justify-center gap-3 py-4 rounded-2xl border border-white/12 bg-white/5 hover:bg-white/10 hover:border-accent/40 text-white font-black text-[11px] uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
      >
        {busy ? (
          <Loader2 size={17} className="animate-spin" />
        ) : (
          <span className="text-accent">
            <Fingerprint size={17} />
          </span>
        )}
        {/* This button is the device passkey — Windows Hello, Touch ID or a
            phone. The camera-based face check is its own button below, so
            naming both "face" here only confused which one to press. */}
        Use fingerprint (device unlock)
      </button>
    </div>
  );
}
