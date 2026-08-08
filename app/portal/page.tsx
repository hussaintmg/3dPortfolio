"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Package,
  ReceiptText,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import EditableText from "@/Components/editable/EditableText";
import { Skeleton } from "@/Components/ui/Skeleton";

interface Assignment {
  _id: string;
  packageName: string;
  price: number;
  currency: string;
  status: string;
  paid: boolean;
  projectUrl?: string;
}
interface Invoice {
  _id: string;
  number: string;
  total: number;
  currency: string;
  status: string;
  isOverdue?: boolean;
  dueDate?: string;
}

export default function PortalOverview() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      axios.get("/api/assignments").catch(() => null),
      axios.get("/api/invoices").catch(() => null),
    ])
      .then(([a, i]) => {
        if (!alive) return;
        if (a?.data?.success) setAssignments(a.data.assignments || []);
        if (i?.data?.success) setInvoices(i.data.invoices || []);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const unpaid = invoices.filter(
    (i) => i.status !== "paid" && i.status !== "cancelled",
  );
  const overdue = invoices.filter((i) => i.isOverdue);
  const outstanding = unpaid.reduce((s, i) => s + (i.total || 0), 0);

  const stats = [
    {
      label: "Active Packages",
      value: assignments.filter((a) => a.status !== "cancelled").length,
      icon: Package,
      href: "/portal/packages",
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      label: "Open Invoices",
      value: unpaid.length,
      icon: ReceiptText,
      href: "/portal/invoices",
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Outstanding",
      value: `$${outstanding}`,
      icon: overdue.length ? AlertTriangle : CheckCircle2,
      href: "/portal/invoices",
      color: overdue.length
        ? "text-red-400 bg-red-500/10 border-red-500/20"
        : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-10 space-y-10 pt-20 lg:pt-10">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-2"
      >
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tighter">
          <EditableText k="portal.greeting">Welcome back</EditableText>,{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-accent to-purple-400">
            {user?.displayName || user?.username}
          </span>
        </h1>
        <EditableText
          k="portal.subheading"
          as="p"
          className="text-sm text-gray-400 font-medium block"
        >
          Everything about your project in one place — packages, invoices and a
          direct line to me.
        </EditableText>
      </motion.header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-3xl" />
            ))
          : stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Link
                    href={s.href}
                    className="block rounded-3xl border border-white/8 bg-card p-7 hover:border-accent/30 transition-all duration-300 hover:-translate-y-1 group"
                  >
                    <div className="flex items-center justify-between mb-5">
                      <div
                        className={`size-11 rounded-2xl border flex items-center justify-center ${s.color}`}
                      >
                        <Icon size={20} />
                      </div>
                      <ArrowRight
                        size={16}
                        className="text-gray-600 group-hover:text-accent group-hover:translate-x-1 transition-all"
                      />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1.5">
                      {s.label}
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-white tracking-tighter">
                      {s.value}
                    </p>
                  </Link>
                </motion.div>
              );
            })}
      </div>

      {/* Overdue warning */}
      {!loading && overdue.length > 0 && (
        <div className="rounded-3xl border border-red-500/30 bg-red-500/5 p-6 flex items-start gap-4">
          <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-black text-red-400 uppercase tracking-widest">
              {overdue.length} overdue invoice{overdue.length > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-gray-400 font-medium mt-1">
              Please settle these to keep your project on schedule.
            </p>
          </div>
          <Link
            href="/portal/invoices"
            className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors shrink-0"
          >
            View
          </Link>
        </div>
      )}

      {/* Recent invoices */}
      <section className="rounded-3xl border border-white/8 bg-card overflow-hidden">
        <div className="px-7 py-5 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-black text-white tracking-tight">
            Recent Invoices
          </h2>
          <Link
            href="/portal/invoices"
            className="text-[10px] font-black uppercase tracking-widest text-accent hover:text-white transition-colors"
          >
            See all
          </Link>
        </div>
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-14 text-center space-y-2">
            <ReceiptText size={26} className="mx-auto text-gray-700" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              No invoices yet
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {invoices.slice(0, 5).map((inv) => (
              <Link
                key={inv._id}
                href={`/portal/invoices/${inv._id}`}
                className="flex items-center gap-4 px-7 py-4 hover:bg-white/3 transition-colors"
              >
                <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 shrink-0">
                  <ReceiptText size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white">{inv.number}</p>
                  {inv.dueDate && (
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                      <Clock size={9} /> Due{" "}
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className="text-sm font-black text-white shrink-0">
                  {inv.currency} {inv.total}
                </span>
                <StatusPill status={inv.isOverdue ? "overdue" : inv.status} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Chat CTA */}
      <Link
        href="/portal/chat"
        className="block rounded-3xl border border-white/8 bg-linear-to-br from-accent/10 to-purple-500/5 p-7 hover:border-accent/40 transition-all group"
      >
        <div className="flex items-center gap-5">
          <div className="size-12 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent shrink-0">
            <MessageSquare size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <EditableText
              k="portal.chat.title"
              as="p"
              className="text-base font-black text-white tracking-tight block"
            >
              Need to discuss something?
            </EditableText>
            <EditableText
              k="portal.chat.body"
              as="p"
              className="text-xs text-gray-400 font-medium mt-0.5 block"
            >
              Message me directly — text, voice notes, files, anything.
            </EditableText>
          </div>
          <ArrowRight
            size={18}
            className="text-gray-500 group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0"
          />
        </div>
      </Link>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    unpaid: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    overdue: "text-red-400 bg-red-500/10 border-red-500/20",
    draft: "text-gray-400 bg-white/5 border-white/10",
    cancelled: "text-gray-500 bg-white/5 border-white/10",
    offered: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    active: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    completed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  };
  return (
    <span
      className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest shrink-0 ${
        map[status] || map.draft
      }`}
    >
      {status}
    </span>
  );
}
