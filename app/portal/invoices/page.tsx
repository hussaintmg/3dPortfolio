"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ReceiptText, ArrowRight, Clock, AlertTriangle } from "lucide-react";
import axios from "axios";
import EditableText from "@/Components/editable/EditableText";
import { Skeleton } from "@/Components/ui/Skeleton";
import { StatusPill } from "../page";

interface Invoice {
  _id: string;
  number: string;
  packageName?: string;
  total: number;
  currency: string;
  status: string;
  isOverdue?: boolean;
  issuedAt?: string;
  dueDate?: string;
}

export default function PortalInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    axios
      .get("/api/invoices")
      .then((r) => {
        if (alive && r.data.success) setInvoices(r.data.invoices || []);
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
          <EditableText k="portal.invoices.heading">Invoices</EditableText>
        </h1>
        <EditableText
          k="portal.invoices.subheading"
          as="p"
          className="text-sm text-gray-400 font-medium block"
        >
          Open any invoice to see the breakdown and download a PDF copy.
        </EditableText>
      </header>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-3xl" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/2 py-20 text-center space-y-3">
          <ReceiptText size={28} className="mx-auto text-gray-700" />
          <p className="text-lg font-black text-white">No invoices yet</p>
          <p className="text-sm text-gray-500 font-medium">
            Invoices appear here as soon as they're issued.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((inv, i) => (
            <motion.div
              key={inv._id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Link
                href={`/portal/invoices/${inv._id}`}
                className={`group flex flex-col sm:flex-row sm:items-center gap-4 rounded-3xl border bg-card p-6 transition-all hover:-translate-y-0.5 ${
                  inv.isOverdue
                    ? "border-red-500/30 hover:border-red-500/50"
                    : "border-white/8 hover:border-accent/30"
                }`}
              >
                <div
                  className={`size-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                    inv.isOverdue
                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                      : "bg-white/5 text-gray-400 border-white/10"
                  }`}
                >
                  {inv.isOverdue ? (
                    <AlertTriangle size={20} />
                  ) : (
                    <ReceiptText size={20} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="text-base font-black text-white">
                      {inv.number}
                    </p>
                    <StatusPill status={inv.isOverdue ? "overdue" : inv.status} />
                  </div>
                  <p className="text-xs text-gray-500 font-medium mt-1 truncate">
                    {inv.packageName || "Services"}
                    {inv.dueDate && (
                      <>
                        {" · "}
                        <span className="inline-flex items-center gap-1">
                          <Clock size={10} /> Due{" "}
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xl font-black text-white tracking-tighter">
                    {inv.currency} {inv.total}
                  </span>
                  <ArrowRight
                    size={17}
                    className="text-gray-600 group-hover:text-accent group-hover:translate-x-1 transition-all"
                  />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
