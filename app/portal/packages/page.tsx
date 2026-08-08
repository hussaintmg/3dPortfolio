"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Package as PackageIcon,
  ExternalLink,
  CheckCircle2,
  Lock,
  MessageSquare,
  Send,
  Clock,
  Loader2,
} from "lucide-react";
import axios from "axios";
import { notify } from "@/lib/notify";
import EditableText from "@/Components/editable/EditableText";
import { SkeletonCard } from "@/Components/ui/Skeleton";
import { StatusPill } from "../page";
import {
  canPay,
  canRequest,
  clientHint,
  type AssignmentStatus,
} from "@/lib/packageFlow";

interface Assignment {
  _id: string;
  packageName: string;
  price: number;
  currency: string;
  status: AssignmentStatus;
  paid: boolean;
  paidAt?: string;
  projectUrl?: string;
  notes?: string;
  startedAt?: string;
  expiresAt?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  declineReason?: string;
}

export default function PortalPackages() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  /** Which card has its request box open. */
  const [requesting, setRequesting] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () =>
    axios
      .get("/api/assignments")
      .then((r) => r.data.success && setAssignments(r.data.assignments || []))
      .catch(() => {});

  /**
   * Asking is all this does. Nothing is charged and no invoice exists until
   * Hussain approves — which is what the copy on the card promises.
   */
  const submitRequest = async (assignmentId: string) => {
    try {
      setBusy(assignmentId);
      const { data } = await axios.post("/api/assignments/request", {
        assignmentId,
        note,
      });
      if (!data.success) throw new Error(data.message);
      notify.success("Request sent", "You'll hear back before anything is charged");
      setRequesting(null);
      setNote("");
      refresh();
    } catch (err: any) {
      notify.error(
        "Could not send",
        err.response?.data?.message || err.message,
      );
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    let alive = true;
    axios
      .get("/api/assignments")
      .then((r) => {
        if (alive && r.data.success) setAssignments(r.data.assignments || []);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="p-4 sm:p-6 md:p-10 space-y-8 pt-20 lg:pt-10">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tighter">
          <EditableText k="portal.packages.heading">My Packages</EditableText>
        </h1>
        <EditableText
          k="portal.packages.subheading"
          as="p"
          className="text-sm text-gray-400 font-medium block"
        >
          Everything assigned to you, with status and project links.
        </EditableText>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/2 py-20 text-center space-y-5">
          <div className="size-14 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
            <PackageIcon size={24} />
          </div>
          <div className="space-y-1.5">
            <p className="text-lg font-black text-white">No packages yet</p>
            <p className="text-sm text-gray-500 font-medium max-w-sm mx-auto">
              Once we agree on a plan it will show up here with its status and
              invoices.
            </p>
          </div>
          <Link
            href="/portal/chat"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-accent text-white text-[11px] font-black uppercase tracking-widest hover:bg-accent-hover transition-colors"
          >
            <MessageSquare size={14} /> Discuss a package
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assignments.map((a, i) => (
            <motion.article
              key={a._id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className="rounded-3xl border border-white/8 bg-card p-7 space-y-5 hover:border-accent/25 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-white tracking-tight truncate">
                    {a.packageName || "Custom package"}
                  </h2>
                  {a.startedAt && (
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-1">
                      Started {new Date(a.startedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <StatusPill status={a.status} />
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tighter">
                  {a.currency} {a.price}
                </span>
                {a.paid && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    <CheckCircle2 size={12} /> Paid
                  </span>
                )}
              </div>

              {a.notes && (
                <p className="text-sm text-gray-400 font-medium leading-relaxed">
                  {a.notes}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5">
                {a.projectUrl && (
                  <a
                    href={a.projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors"
                  >
                    <ExternalLink size={13} /> View project
                  </a>
                )}
                {a.paid ? (
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                    <Lock size={13} /> Payment complete
                  </span>
                ) : canPay(a) ? (
                  <Link
                    href={
                      a.invoiceId
                        ? `/portal/invoices/${a.invoiceId}`
                        : "/portal/invoices"
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-[10px] font-black uppercase tracking-widest hover:bg-accent-hover transition-colors"
                  >
                    Pay {a.invoiceNumber || "invoice"}
                  </Link>
                ) : canRequest(a) ? (
                  <button
                    onClick={() => setRequesting(a._id)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-[10px] font-black uppercase tracking-widest hover:bg-accent-hover transition-colors cursor-pointer"
                  >
                    <Send size={13} /> Request this
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                    <Clock size={13} /> With Hussain
                  </span>
                )}
              </div>

              {/* Always say what happens next — a status pill alone doesn't */}
              {clientHint(a) && (
                <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                  {clientHint(a)}
                </p>
              )}
              {a.status === "declined" && a.declineReason && (
                <p className="text-[11px] text-red-400/90 font-medium leading-relaxed">
                  {a.declineReason}
                </p>
              )}

              {requesting === a._id && (
                <div className="space-y-2 pt-1">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Anything I should know? (optional)"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-accent resize-none placeholder:text-gray-600"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => submitRequest(a._id)}
                      disabled={busy === a._id}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                    >
                      {busy === a._id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Send size={13} />
                      )}
                      Send request
                    </button>
                    <button
                      onClick={() => {
                        setRequesting(null);
                        setNote("");
                      }}
                      className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-[10px] font-black uppercase tracking-widest cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}
