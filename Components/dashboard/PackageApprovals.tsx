"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Check, X, Loader2, Inbox, Clock } from "lucide-react";
import { notify } from "@/lib/notify";
import { STATUS_LABEL, STATUS_TONE, type AssignmentStatus } from "@/lib/packageFlow";

interface Assignment {
  _id: string;
  userId: string;
  packageName: string;
  price: number;
  currency: string;
  status: AssignmentStatus;
  source?: string;
  requestNote?: string;
  requestedAt?: string;
  invoiceNumber?: string;
  client?: { username?: string; email?: string } | null;
}

/**
 * Requests waiting on the owner.
 *
 * This is the gate the whole package flow hangs on: until something here is
 * approved, no invoice exists and the client has nothing to pay. It sits at
 * the top of the packages screen so a pending request can't be missed.
 */
export default function PackageApprovals() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/assignments");
      if (data.success) {
        setItems(
          (data.assignments || []).filter(
            (a: Assignment) => a.status === "requested",
          ),
        );
      }
    } catch {
      // the rest of the screen still works
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // A request can arrive while this screen is open
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const decide = async (id: string, decision: "approve" | "decline") => {
    try {
      setBusy(id);
      const { data } = await axios.post(`/api/assignments/${id}/decide`, {
        decision,
        reason: decision === "decline" ? reason : undefined,
      });
      if (!data.success) throw new Error(data.message);

      notify.success(
        decision === "approve" ? "Approved" : "Declined",
        decision === "approve"
          ? `Invoice ${data.invoice?.number} raised — they can pay now`
          : "The client has been told",
      );
      setDeclining(null);
      setReason("");
      load();
    } catch (err: any) {
      notify.error("Could not save", err.response?.data?.message || err.message);
    } finally {
      setBusy(null);
    }
  };

  if (loading || items.length === 0) return null;

  return (
    <section className="rounded-3xl border border-amber-500/25 bg-amber-500/5 p-5 sm:p-6 space-y-4 mb-8">
      <div className="flex items-center gap-2.5">
        <span className="size-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400">
          <Inbox size={17} />
        </span>
        <div>
          <h2 className="text-xs font-black text-amber-400 uppercase tracking-[0.2em]">
            Waiting for you
          </h2>
          <p className="text-[11px] text-gray-400 font-medium">
            {items.length} package request{items.length > 1 ? "s" : ""} · nobody
            can pay until you approve
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((a) => (
          <div
            key={a._id}
            className="rounded-2xl border border-white/10 bg-[#0d0d14]/60 p-4 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white truncate">
                  {a.packageName}
                </p>
                <p className="text-[11px] font-bold text-gray-500">
                  {a.client?.username || a.client?.email || "A client"} ·{" "}
                  {a.currency || "USD"} {Number(a.price).toLocaleString()}
                  {a.source === "catalog" && " · from the public list"}
                </p>
                {a.requestNote && (
                  <p className="mt-2 text-[12px] text-gray-300 font-medium leading-relaxed rounded-lg bg-white/5 border border-white/8 px-3 py-2">
                    “{a.requestNote}”
                  </p>
                )}
                {a.requestedAt && (
                  <p className="mt-1.5 text-[10px] font-bold text-gray-600 flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(a.requestedAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => decide(a._id, "approve")}
                  disabled={busy === a._id}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500 hover:text-white disabled:opacity-40 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                >
                  {busy === a._id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Check size={13} />
                  )}
                  Approve
                </button>
                <button
                  onClick={() =>
                    setDeclining(declining === a._id ? null : a._id)
                  }
                  disabled={busy === a._id}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-400/40 disabled:opacity-40 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                >
                  <X size={13} /> Decline
                </button>
              </div>
            </div>

            {declining === a._id && (
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why? (they'll see this)"
                  className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-accent placeholder:text-gray-600"
                />
                <button
                  onClick={() => decide(a._id, "decline")}
                  disabled={busy === a._id}
                  className="px-5 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Confirm decline
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Small status pill, shared by the portal and the dashboard. */
export function StatusPill({ status }: { status: AssignmentStatus }) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${
        STATUS_TONE[status] || STATUS_TONE.cancelled
      }`}
    >
      {STATUS_LABEL[status] || status}
    </span>
  );
}
