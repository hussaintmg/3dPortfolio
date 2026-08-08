"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CreditCard,
  Landmark,
  Smartphone,
  Globe,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  ImagePlus,
  Clock,
  CheckCircle2,
  Send,
} from "lucide-react";
import axios from "axios";
import { notify } from "@/lib/notify";
import FloatingInput from "@/Components/ui/FloatingInput";
import FloatingTextarea from "@/Components/ui/FloatingTextarea";
import { Skeleton } from "@/Components/ui/Skeleton";
import { cn } from "@/lib/cn";

const META: Record<
  string,
  { label: string; icon: React.ReactNode; hosted?: boolean }
> = {
  bank: { label: "Bank Transfer", icon: <Landmark size={16} /> },
  jazzcash: { label: "JazzCash", icon: <Smartphone size={16} /> },
  easypaisa: { label: "EasyPaisa", icon: <Smartphone size={16} /> },
  payoneer: { label: "Payoneer", icon: <Globe size={16} />, hosted: true },
  wise: { label: "Wise", icon: <Globe size={16} />, hosted: true },
  paddle: { label: "Card (Paddle)", icon: <CreditCard size={16} />, hosted: true },
};

/** One copyable detail row. */
function Detail({ label, value }: { label: string; value?: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-bold text-white truncate">{value}</span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
          className="p-1 rounded text-gray-500 hover:text-accent transition-colors shrink-0"
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  );
}

interface Props {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  /** Hides the whole panel once the invoice is settled. */
  paid: boolean;
  onReported?: () => void;
}

export default function PayInvoicePanel({
  invoiceId,
  invoiceNumber,
  amount,
  currency,
  paid,
  onReported,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [intro, setIntro] = useState("");
  const [methods, setMethods] = useState<Record<string, any>>({});
  const [active, setActive] = useState<string>("");
  const [pending, setPending] = useState<any>(null);

  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofKey, setProofKey] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cfg, mine] = await Promise.all([
        axios.get("/api/payment-settings"),
        axios.get("/api/payments").catch(() => null),
      ]);
      if (cfg.data.success) {
        setIntro(cfg.data.intro || "");
        setMethods(cfg.data.methods || {});
        const first = Object.keys(cfg.data.methods || {})[0];
        if (first) setActive(first);
      }
      const mySub = mine?.data?.submissions?.find(
        (s: any) => s.invoiceId === invoiceId && s.status === "pending",
      );
      setPending(mySub || null);
    } catch {
      // panel just won't render
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    load();
  }, [load]);

  const uploadProof = async (file: File) => {
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "payment-proofs");
      const res = await fetch("/api/upload", { method: "POST", body: fd }).then(
        (r) => r.json(),
      );
      if (res.success) {
        setProofUrl(res.publicUrl);
        setProofKey(res.filePath);
        notify.success("Screenshot attached");
      } else {
        notify.error("Upload failed", res.error);
      }
    } catch (e: any) {
      notify.error("Upload failed", e.message);
    } finally {
      setUploading(false);
    }
  };

  const report = async () => {
    try {
      setSubmitting(true);
      const { data } = await axios.post("/api/payments", {
        invoiceId,
        method: active,
        reference,
        note,
        proofUrl,
        proofStorageKey: proofKey,
      });
      if (data.success) {
        notify.success("Payment reported", data.message);
        setPending(data.submission);
        setReference("");
        setNote("");
        setProofUrl("");
        onReported?.();
      } else {
        notify.error("Could not submit", data.message);
      }
    } catch (e: any) {
      notify.error("Could not submit", e.response?.data?.message || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (paid) return null;

  if (loading)
    return (
      <div className="rounded-3xl border border-white/8 bg-card p-7 space-y-4 print:hidden">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );

  const ids = Object.keys(methods);
  if (ids.length === 0) return null;

  const cfg = methods[active] || {};
  const meta = META[active] || { label: active, icon: <CreditCard size={16} /> };

  return (
    <section className="rounded-3xl border border-white/8 bg-card overflow-hidden print:hidden">
      <div className="px-7 py-5 border-b border-white/8">
        <h2 className="text-base font-black text-white tracking-tight">
          Pay {invoiceNumber} — {currency} {amount}
        </h2>
        {intro && (
          <p className="text-xs text-gray-400 font-medium mt-1 leading-relaxed">
            {intro}
          </p>
        )}
      </div>

      {pending ? (
        <div className="p-7 flex items-start gap-4">
          <Clock size={20} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-amber-400 uppercase tracking-widest">
              Awaiting confirmation
            </p>
            <p className="text-xs text-gray-400 font-medium mt-1.5 leading-relaxed">
              You reported a {pending.method} payment
              {pending.reference && ` (ref ${pending.reference})`}. I'll confirm
              it and the invoice will flip to paid — you'll see it here.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Method picker */}
          <div className="flex flex-wrap gap-2 px-7 py-4 border-b border-white/8">
            {ids.map((id) => {
              const m = META[id] || { label: id, icon: <CreditCard size={16} /> };
              return (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-colors",
                    active === id
                      ? "bg-accent text-white border-accent"
                      : "bg-white/5 border-white/10 text-gray-400 hover:text-white",
                  )}
                >
                  {m.icon}
                  {m.label}
                </button>
              );
            })}
          </div>

          <div className="p-7 space-y-6">
            {cfg.instructions && (
              <p className="text-sm text-gray-300 font-medium leading-relaxed">
                {cfg.instructions}
              </p>
            )}

            {/* Hosted checkout */}
            {cfg.paymentLink && (
              <a
                href={cfg.paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-[11px] font-black uppercase tracking-widest transition-all active:scale-95"
              >
                <ExternalLink size={14} /> Pay with {meta.label}
              </a>
            )}

            {/* Account details to transfer to */}
            {(cfg.accountTitle ||
              cfg.accountNumber ||
              cfg.iban ||
              cfg.phone ||
              cfg.email) && (
              <div className="rounded-2xl border border-white/8 bg-white/3 px-5 py-2">
                <Detail label="Bank" value={cfg.bankName} />
                <Detail label="Account title" value={cfg.accountTitle} />
                <Detail label="Account no." value={cfg.accountNumber} />
                <Detail label="IBAN" value={cfg.iban} />
                <Detail label="Branch" value={cfg.branch} />
                <Detail label="SWIFT" value={cfg.swift} />
                <Detail label="Number" value={cfg.phone} />
                <Detail label="Email" value={cfg.email} />
              </div>
            )}

            {/* Report it */}
            <div className="space-y-4 pt-2 border-t border-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-accent pt-4">
                Already sent it? Tell me here
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FloatingInput
                  label="Transaction / reference id"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
                <label className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 cursor-pointer transition-colors">
                  {uploading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : proofUrl ? (
                    <CheckCircle2 size={13} className="text-emerald-400" />
                  ) : (
                    <ImagePlus size={13} />
                  )}
                  {proofUrl ? "Screenshot attached" : "Attach screenshot"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && uploadProof(e.target.files[0])
                    }
                  />
                </label>
              </div>

              <FloatingTextarea
                label="Anything I should know? (optional)"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              <button
                onClick={report}
                disabled={submitting || !active}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-[11px] uppercase tracking-widest transition-all active:scale-[0.99]"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                I've sent this payment
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
