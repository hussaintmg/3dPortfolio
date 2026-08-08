"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, Loader2, ScanFace } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import axios from "axios";
import { notify } from "@/lib/notify";

/**
 * "Sign in with fingerprint / face" — one tap, no password. Renders only when
 * the browser actually supports WebAuthn.
 */
export default function PasskeyButton() {
  const router = useRouter();
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        !!window.PublicKeyCredential &&
        !!navigator.credentials,
    );
  }, []);

  if (!supported) return null;

  const signIn = async () => {
    try {
      setBusy(true);
      const { data: opt } = await axios.get("/api/auth/passkey/authenticate");
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
      // A user cancelling the OS prompt is not an error worth shouting about
      if (err?.name === "NotAllowedError" || err?.name === "AbortError") return;
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

      <button
        type="button"
        onClick={signIn}
        disabled={busy}
        className="w-full group flex items-center justify-center gap-3 py-4 rounded-2xl border border-white/12 bg-white/5 hover:bg-white/10 hover:border-accent/40 text-white font-black text-[11px] uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? (
          <Loader2 size={17} className="animate-spin" />
        ) : (
          <span className="flex items-center gap-1.5 text-accent">
            <Fingerprint size={17} />
            <ScanFace size={17} />
          </span>
        )}
        Use fingerprint or face
      </button>
    </div>
  );
}
