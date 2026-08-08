"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { MailCheck, MailX, Loader2, ArrowRight, Send } from "lucide-react";
import axios from "axios";
import { notify } from "@/lib/notify";
import EditableText from "@/Components/editable/EditableText";

type State =
  | { phase: "checking" }
  | { phase: "done"; email: string; already: boolean }
  | { phase: "failed"; reason: "expired" | "invalid"; message: string };

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params?.get("token") || "";
  const [state, setState] = useState<State>({ phase: "checking" });
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setState({
        phase: "failed",
        reason: "invalid",
        message: "This link is missing its token.",
      });
      return;
    }
    let alive = true;
    axios
      .get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (!alive) return;
        setState({
          phase: "done",
          email: res.data.email || "",
          already: !!res.data.alreadyVerified,
        });
      })
      .catch((err) => {
        if (!alive) return;
        const data = err.response?.data;
        setState({
          phase: "failed",
          reason: data?.reason === "expired" ? "expired" : "invalid",
          message: data?.message || "This link isn't valid.",
        });
      });
    return () => {
      alive = false;
    };
  }, [token]);

  const resend = async () => {
    try {
      setResending(true);
      const { data } = await axios.post("/api/auth/verify-email", {});
      notify.success("Check your inbox", data.message);
    } catch (err: any) {
      notify.error(
        "Could not resend",
        err.response?.data?.message ||
          "Sign in first, then request a new link from your profile.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-card p-8 sm:p-10 text-center space-y-6"
      >
        {state.phase === "checking" && (
          <>
            <div className="mx-auto size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-accent">
              <Loader2 size={28} className="animate-spin" />
            </div>
            <h1 className="text-2xl font-black text-white">Checking your link…</h1>
          </>
        )}

        {state.phase === "done" && (
          <>
            <div className="mx-auto size-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
              <MailCheck size={28} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white">
                <EditableText k="verify.success.heading">
                  Email confirmed
                </EditableText>
              </h1>
              <p className="text-sm text-gray-400 font-medium leading-relaxed">
                {state.already
                  ? "This address was already confirmed — nothing more to do."
                  : "Thanks — we know this address is really yours."}
                {state.email && (
                  <span className="block mt-1 text-white font-bold break-all">
                    {state.email}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/portal"
                className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-accent hover:bg-accent-hover text-white font-black text-[11px] uppercase tracking-widest transition-colors"
              >
                Go to my portal <ArrowRight size={14} />
              </Link>
              <Link
                href="/"
                className="flex-1 inline-flex items-center justify-center py-3.5 rounded-2xl bg-white/5 border border-white/10 text-gray-300 hover:text-white font-black text-[11px] uppercase tracking-widest transition-colors"
              >
                Back to site
              </Link>
            </div>
          </>
        )}

        {state.phase === "failed" && (
          <>
            <div className="mx-auto size-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <MailX size={28} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white">
                {state.reason === "expired" ? "Link expired" : "Link not valid"}
              </h1>
              <p className="text-sm text-gray-400 font-medium leading-relaxed">
                {state.message}
              </p>
            </div>

            {/* Only an expired link is worth resending — a forged one isn't */}
            {state.reason === "expired" && (
              <button
                onClick={resend}
                disabled={resending}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-black text-[11px] uppercase tracking-widest transition-colors cursor-pointer"
              >
                {resending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Send me a new link
              </button>
            )}

            <Link
              href="/login"
              className="block text-[11px] font-black uppercase tracking-widest text-gray-500 hover:text-accent transition-colors"
            >
              Back to sign in
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-accent" />
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
