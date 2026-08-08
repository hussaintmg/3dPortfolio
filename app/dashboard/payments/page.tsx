"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CreditCard,
  Landmark,
  Smartphone,
  Globe,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  Inbox,
  ExternalLink,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";
import axios from "axios";
import { notify } from "@/lib/notify";
import FloatingInput from "@/Components/ui/FloatingInput";
import FloatingTextarea from "@/Components/ui/FloatingTextarea";
import Toggle from "@/Components/ui/Toggle";
import { Skeleton } from "@/Components/ui/Skeleton";
import ConfirmationModal from "@/Components/dashboard/ConfirmationModal";
import { cn } from "@/lib/cn";

type MethodId =
  | "bank"
  | "jazzcash"
  | "easypaisa"
  | "payoneer"
  | "wise"
  | "paddle";

interface MethodDef {
  id: MethodId;
  label: string;
  blurb: string;
  icon: React.ReactNode;
  /** Which inputs this method shows. */
  fields: {
    key: string;
    label: string;
    secret?: boolean;
    placeholder?: string;
  }[];
}

const METHODS: MethodDef[] = [
  {
    id: "bank",
    label: "Bank Transfer",
    blurb: "Direct transfer into your account — the client sends you the reference.",
    icon: <Landmark size={18} />,
    fields: [
      { key: "bankName", label: "Bank name" },
      { key: "accountTitle", label: "Account title" },
      { key: "accountNumber", label: "Account number" },
      { key: "iban", label: "IBAN" },
      { key: "branch", label: "Branch / code" },
      { key: "swift", label: "SWIFT (for international)" },
    ],
  },
  {
    id: "jazzcash",
    label: "JazzCash",
    blurb: "Pakistani mobile wallet. Client sends to your number and shares the TID.",
    icon: <Smartphone size={18} />,
    fields: [
      { key: "accountTitle", label: "Account title" },
      { key: "phone", label: "JazzCash number" },
    ],
  },
  {
    id: "easypaisa",
    label: "EasyPaisa",
    blurb: "Pakistani mobile wallet. Same flow as JazzCash.",
    icon: <Smartphone size={18} />,
    fields: [
      { key: "accountTitle", label: "Account title" },
      { key: "phone", label: "EasyPaisa number" },
    ],
  },
  {
    id: "payoneer",
    label: "Payoneer",
    blurb:
      "International. Paste a Payoneer request-a-payment link, or just your Payoneer email.",
    icon: <Globe size={18} />,
    fields: [
      { key: "email", label: "Payoneer email" },
      { key: "paymentLink", label: "Request-payment link", placeholder: "https://payoneer.com/…" },
      { key: "currency", label: "Currency", placeholder: "USD" },
    ],
  },
  {
    id: "wise",
    label: "Wise",
    blurb: "International transfers with good rates. Share your Wise link or email.",
    icon: <Globe size={18} />,
    fields: [
      { key: "email", label: "Wise email" },
      { key: "paymentLink", label: "Wise payment link", placeholder: "https://wise.com/pay/…" },
      { key: "currency", label: "Currency", placeholder: "USD" },
    ],
  },
  {
    id: "paddle",
    label: "Paddle",
    blurb:
      "Card checkout that settles to you as merchant of record. Invoices settle automatically via webhook.",
    icon: <CreditCard size={18} />,
    fields: [
      { key: "paymentLink", label: "Checkout link", placeholder: "https://pay.paddle.io/…" },
      { key: "vendorId", label: "Seller / vendor ID" },
      { key: "apiKey", label: "API key", secret: true },
      { key: "webhookSecret", label: "Webhook secret", secret: true },
    ],
  },
];

interface Submission {
  _id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  method: string;
  amount: number;
  currency: string;
  reference: string;
  note: string;
  proofUrl: string;
  status: "pending" | "confirmed" | "rejected";
  createdAt: string;
}

export default function PaymentsPage() {
  const [intro, setIntro] = useState("");
  const [methods, setMethods] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState<Submission | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cfg, list] = await Promise.all([
        axios.get("/api/payment-settings"),
        axios.get("/api/payments").catch(() => null),
      ]);
      if (cfg.data.success) {
        setIntro(cfg.data.intro || "");
        setMethods(cfg.data.methods || {});
      }
      if (list?.data?.success) setSubs(list.data.submissions || []);
    } catch (e: any) {
      notify.error("Could not load payment settings", e.response?.data?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (id: MethodId, key: string, value: any) =>
    setMethods((m) => ({ ...m, [id]: { ...(m[id] || {}), [key]: value } }));

  const save = async () => {
    try {
      setSaving(true);
      const { data } = await axios.put("/api/payment-settings", {
        intro,
        methods,
      });
      if (data.success) {
        notify.success(data.message);
        setMethods(data.methods || {});
      } else notify.error("Save failed", data.message);
    } catch (e: any) {
      notify.error("Save failed", e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const review = async (s: Submission, status: "confirmed" | "rejected", note = "") => {
    try {
      setBusy(true);
      const { data } = await axios.patch(`/api/payments/${s._id}`, {
        status,
        reviewNote: note,
      });
      if (data.success) {
        notify.success(data.message);
        setRejecting(null);
        load();
      } else notify.error("Update failed", data.message);
    } catch (e: any) {
      notify.error("Update failed", e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/paddle`
      : "";

  const pending = subs.filter((s) => s.status === "pending");
  const reviewed = subs.filter((s) => s.status !== "pending");
  const enabledCount = METHODS.filter((m) => methods[m.id]?.enabled).length;

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight flex items-center gap-4">
              <div className="size-12 rounded-xl bg-card flex items-center justify-center text-accent border border-white/10">
                <CreditCard size={24} />
              </div>
              Payments
            </h1>
            <p className="text-gray-400 font-medium text-sm max-w-2xl">
              Switch on the ways clients can pay you. Enabled methods appear on
              their unpaid invoices in the portal.
            </p>
          </div>
          <button
            onClick={save}
            disabled={saving || loading}
            className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 w-fit"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save settings
          </button>
        </header>

        {/* Pending reports */}
        {!loading && pending.length > 0 && (
          <section className="rounded-3xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
            <div className="px-7 py-4 border-b border-amber-500/20 flex items-center gap-2">
              <Inbox size={15} className="text-amber-400" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">
                {pending.length} payment{pending.length > 1 ? "s" : ""} awaiting your confirmation
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {pending.map((s) => (
                <div
                  key={s._id}
                  className="flex flex-col lg:flex-row lg:items-center gap-4 px-7 py-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-white">
                      {s.invoiceNumber} · {s.currency} {s.amount}
                    </p>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                      {s.clientName} paid by{" "}
                      <span className="text-white font-bold capitalize">{s.method}</span>
                      {s.reference && ` · ref ${s.reference}`}
                    </p>
                    {s.note && (
                      <p className="text-[11px] text-gray-500 mt-1 italic">"{s.note}"</p>
                    )}
                  </div>

                  {s.proofUrl && (
                    <a
                      href={s.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-accent hover:text-white transition-colors shrink-0"
                    >
                      <ExternalLink size={12} /> Proof
                    </a>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => review(s, "confirmed")}
                      disabled={busy}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 size={13} /> Confirm
                    </button>
                    <button
                      onClick={() => setRejecting(s)}
                      disabled={busy}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-red-400 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <div className="space-y-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-3xl" />
            ))}
          </div>
        ) : (
          <>
            <section className="rounded-3xl border border-white/10 bg-card p-8 space-y-5">
              <h2 className="text-xs font-black text-accent uppercase tracking-[0.2em]">
                Intro shown to clients
              </h2>
              <FloatingTextarea
                label="Payment instructions intro"
                rows={2}
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
              />
              <p className="text-[11px] text-gray-500 font-medium">
                {enabledCount === 0
                  ? "No methods enabled yet — clients won't see a pay panel."
                  : `${enabledCount} method${enabledCount > 1 ? "s" : ""} enabled.`}
              </p>
            </section>

            {METHODS.map((m) => {
              const cfg = methods[m.id] || {};
              const on = !!cfg.enabled;
              return (
                <section
                  key={m.id}
                  className={cn(
                    "rounded-3xl border p-8 space-y-6 transition-colors",
                    on ? "border-accent/30 bg-card" : "border-white/10 bg-card/60",
                  )}
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex items-start gap-4 min-w-0">
                      <div
                        className={cn(
                          "size-11 rounded-2xl border flex items-center justify-center shrink-0",
                          on
                            ? "bg-accent/10 border-accent/25 text-accent"
                            : "bg-white/5 border-white/10 text-gray-500",
                        )}
                      >
                        {m.icon}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-black text-white tracking-tight">
                          {m.label}
                        </h2>
                        <p className="text-xs text-gray-500 font-medium mt-1 max-w-md leading-relaxed">
                          {m.blurb}
                        </p>
                      </div>
                    </div>
                    <Toggle
                      checked={on}
                      onChange={(v) => setField(m.id, "enabled", v)}
                      aria-label={`${m.label} enabled`}
                    />
                  </div>

                  {on && (
                    <div className="space-y-5 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {m.fields.map((f) => (
                          <FloatingInput
                            key={f.key}
                            label={
                              f.secret && cfg[`has${f.key[0].toUpperCase()}${f.key.slice(1)}`]
                                ? `${f.label} (saved — type to replace)`
                                : f.label
                            }
                            type={f.secret ? "password" : "text"}
                            value={f.secret ? cfg[f.key] || "" : cfg[f.key] || ""}
                            onChange={(e) => setField(m.id, f.key, e.target.value)}
                            icon={f.secret ? <KeyRound size={15} /> : undefined}
                          />
                        ))}
                      </div>

                      {m.id === "paddle" && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                              Environment
                            </span>
                            <select
                              value={cfg.environment || "sandbox"}
                              onChange={(e) =>
                                setField(m.id, "environment", e.target.value)
                              }
                              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-accent cursor-pointer"
                            >
                              <option value="sandbox" className="bg-[#111827]">Sandbox</option>
                              <option value="production" className="bg-[#111827]">Production</option>
                            </select>
                          </div>

                          <div className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-accent">
                              Webhook URL
                            </p>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 min-w-0 truncate text-[11px] font-mono text-gray-300 bg-black/40 rounded-lg px-3 py-2">
                                {webhookUrl}
                              </code>
                              <button
                                onClick={() => {
                                  navigator.clipboard?.writeText(webhookUrl);
                                  setCopied(true);
                                  setTimeout(() => setCopied(false), 1400);
                                }}
                                className="size-9 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-accent transition-colors shrink-0"
                              >
                                {copied ? (
                                  <Check size={14} className="text-emerald-400" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                            <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                              Add this in Paddle → Notifications, paste the signing
                              secret above, and include{" "}
                              <code className="text-gray-300">
                                custom_data.invoiceId
                              </code>{" "}
                              on the checkout so paid invoices settle themselves.
                            </p>
                          </div>
                        </div>
                      )}

                      <FloatingTextarea
                        label="Instructions shown to the client"
                        rows={2}
                        value={cfg.instructions || ""}
                        onChange={(e) => setField(m.id, "instructions", e.target.value)}
                      />
                    </div>
                  )}
                </section>
              );
            })}

            {/* History */}
            {reviewed.length > 0 && (
              <section className="rounded-3xl border border-white/10 bg-card overflow-hidden">
                <div className="px-7 py-4 border-b border-white/5">
                  <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
                    Reviewed reports
                  </h2>
                </div>
                <div className="divide-y divide-white/5">
                  {reviewed.slice(0, 12).map((s) => (
                    <div key={s._id} className="flex items-center gap-4 px-7 py-4">
                      <span
                        className={cn(
                          "px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest shrink-0",
                          s.status === "confirmed"
                            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                            : "text-red-400 bg-red-500/10 border-red-500/20",
                        )}
                      >
                        {s.status}
                      </span>
                      <p className="text-sm font-bold text-white min-w-0 truncate flex-1">
                        {s.invoiceNumber} · {s.clientName}
                      </p>
                      <span className="text-xs font-bold text-gray-500 shrink-0 capitalize">
                        {s.method}
                      </span>
                      <span className="text-xs font-black text-white shrink-0">
                        {s.currency} {s.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!rejecting}
        title="Reject this payment report?"
        message={`${rejecting?.clientName}'s report for ${rejecting?.invoiceNumber} will be marked rejected. The invoice stays unpaid and they can report again.`}
        confirmText="Reject report"
        cancelText="Keep pending"
        isLoading={busy}
        onConfirm={() => rejecting && review(rejecting, "rejected")}
        onClose={() => setRejecting(null)}
        type="danger"
      />
    </div>
  );
}
