"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReceiptText,
  Plus,
  X,
  Loader2,
  Trash2,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { notify } from "@/lib/notify";
import FloatingInput from "@/Components/ui/FloatingInput";
import FloatingTextarea from "@/Components/ui/FloatingTextarea";
import DataTable, { Column } from "@/Components/ui/DataTable";
import ConfirmationModal from "@/Components/dashboard/ConfirmationModal";
import PdfDownloadButton from "@/Components/documents/PdfDownloadButton";

interface Invoice {
  _id: string;
  number: string;
  userId: string;
  clientName: string;
  clientEmail: string;
  packageName?: string;
  items: { description: string; quantity: number; unitPrice: number }[];
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  isOverdue?: boolean;
  dueDate?: string;
  issuedAt?: string;
  paymentMethod?: string;
}

interface Client {
  _id: string;
  username: string;
  displayName?: string;
  email: string;
}

const PAYMENT_METHODS = [
  "Bank Transfer",
  "JazzCash",
  "EasyPaisa",
  "Meezan Bank",
  "Cash",
  "Other / External Gateway",
];

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    paid: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    unpaid: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    overdue: "text-red-400 bg-red-500/10 border-red-500/20",
    draft: "text-gray-400 bg-white/5 border-white/10",
    cancelled: "text-gray-500 bg-white/5 border-white/10",
  };
  return (
    <span
      className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${map[status] || map.draft}`}
    >
      {status}
    </span>
  );
};

export default function DashboardInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<Invoice | null>(null);
  const [payMethod, setPayMethod] = useState(PAYMENT_METHODS[0]);
  const [payRef, setPayRef] = useState("");

  const [form, setForm] = useState({
    userId: "",
    packageName: "",
    currency: "USD",
    discount: 0,
    dueDate: "",
    notes: "",
    items: [{ description: "", quantity: 1, unitPrice: 0 }],
  });

  const fetchAll = useCallback(async () => {
    try {
      const [inv, usr] = await Promise.all([
        axios.get("/api/invoices"),
        axios.get("/api/dashboard/clients").catch(() => null),
      ]);
      if (inv.data.success) setInvoices(inv.data.invoices || []);
      if (usr?.data?.success) setClients(usr.data.clients || []);
    } catch {
      notify.error("Could not load invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const totals = useMemo(() => {
    const subtotal = form.items.reduce(
      (s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0),
      0,
    );
    return { subtotal, total: Math.max(0, subtotal - Number(form.discount || 0)) };
  }, [form.items, form.discount]);

  const createInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId) {
      notify.error("Pick a client first");
      return;
    }
    try {
      setSubmitting(true);
      const res = await axios.post("/api/invoices", form);
      if (res.data.success) {
        notify.success("Invoice created", res.data.invoice.number);
        setModalOpen(false);
        setForm({
          userId: "",
          packageName: "",
          currency: "USD",
          discount: 0,
          dueDate: "",
          notes: "",
          items: [{ description: "", quantity: 1, unitPrice: 0 }],
        });
        fetchAll();
      } else notify.error("Create failed", res.data.message);
    } catch (err: any) {
      notify.error("Create failed", err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const markPaid = async () => {
    if (!payFor) return;
    try {
      setSubmitting(true);
      const res = await axios.patch(`/api/invoices/${payFor._id}`, {
        status: "paid",
        paymentMethod: payMethod,
        paymentReference: payRef,
      });
      if (res.data.success) {
        notify.success("Marked as paid", `${payFor.number} · ${payMethod}`);
        setPayFor(null);
        setPayRef("");
        fetchAll();
      } else notify.error("Update failed", res.data.message);
    } catch (err: any) {
      notify.error("Update failed", err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteInvoice = async () => {
    if (!deletingId) return;
    try {
      setSubmitting(true);
      await axios.delete(`/api/invoices/${deletingId}`);
      notify.success("Invoice deleted");
      setDeletingId(null);
      fetchAll();
    } catch (err: any) {
      notify.error("Delete failed", err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<Invoice>[] = [
    {
      id: "number",
      header: "Invoice",
      cell: (r) => (
        <div className="flex items-center gap-3">
          <div
            className={`size-10 rounded-xl flex items-center justify-center border shrink-0 ${
              r.isOverdue
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-[#0A0A0A] text-accent border-white/10"
            }`}
          >
            {r.isOverdue ? <AlertTriangle size={16} /> : <ReceiptText size={16} />}
          </div>
          <div>
            <p className="text-sm font-black text-white">{r.number}</p>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
              {r.issuedAt ? new Date(r.issuedAt).toLocaleDateString() : "—"}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "client",
      header: "Client",
      cell: (r) => (
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">{r.clientName}</p>
          <p className="text-[11px] text-gray-500 truncate">{r.clientEmail}</p>
        </div>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      cell: (r) => (
        <span className="text-sm font-black text-white">
          {r.currency} {r.total}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (r) => <StatusBadge status={r.isOverdue ? "overdue" : r.status} />,
    },
    {
      id: "due",
      header: "Due Date",
      cell: (r) => (
        <span
          className={`text-xs font-bold ${r.isOverdue ? "text-red-400" : "text-gray-400"}`}
        >
          {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      locked: true,
      className: "text-right",
      headerClassName: "text-right",
      cell: (r) => (
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {r.status !== "paid" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPayFor(r);
              }}
              title="Mark as paid"
              className="size-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all"
            >
              <CheckCircle2 size={15} />
            </button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <PdfDownloadButton
              invoiceId={r._id}
              filename={`${r.number}.pdf`}
              label="PDF"
              allowEmail
              className="px-4 py-2 text-[10px]"
            />
          </div>
          <a
            href={`/portal/invoices/${r._id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Open invoice"
            className="size-9 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:bg-accent hover:text-white transition-all"
          >
            <ExternalLink size={15} />
          </a>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeletingId(r._id);
            }}
            className="size-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight flex items-center gap-4">
              <div className="size-12 rounded-xl bg-card flex items-center justify-center text-accent border border-white/10">
                <ReceiptText size={24} />
              </div>
              Invoices
            </h1>
            <p className="text-gray-400 font-medium text-sm">
              Issue invoices, mark payments received from any source, track dues.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="bg-accent hover:bg-accent-hover text-white font-bold text-sm py-4 px-8 rounded-xl transition-all shadow-lg shadow-accent/20 active:scale-95 flex items-center gap-2 w-fit"
          >
            <Plus size={18} /> New Invoice
          </button>
        </header>

        <DataTable
          tableKey="dashboard-invoices"
          columns={columns}
          rows={invoices}
          rowKey={(r) => r._id}
          loading={loading}
          emptyMessage="No invoices yet — create your first one above."
        />
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 14 }}
              className="relative w-full max-w-3xl bg-card rounded-3xl border border-white/10 p-8 shadow-2xl my-auto max-h-[92vh] overflow-y-auto custom-scrollbar"
              data-lenis-prevent
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  New Invoice
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={createInvoice} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">
                      Client
                    </label>
                    <select
                      required
                      value={form.userId}
                      onChange={(e) =>
                        setForm({ ...form, userId: e.target.value })
                      }
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-white text-sm outline-none focus:border-accent transition-all cursor-pointer"
                    >
                      <option value="" className="bg-[#111827]">
                        Select a client…
                      </option>
                      {clients.map((c) => (
                        <option key={c._id} value={c._id} className="bg-[#111827]">
                          {c.displayName || c.username} — {c.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <FloatingInput
                    label="Package name (optional)"
                    value={form.packageName}
                    onChange={(e) =>
                      setForm({ ...form, packageName: e.target.value })
                    }
                  />
                </div>

                {/* Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">
                      Line Items
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          items: [
                            ...form.items,
                            { description: "", quantity: 1, unitPrice: 0 },
                          ],
                        })
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent border border-accent/20 text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-all"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  {form.items.map((item, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_80px_110px_40px] gap-3 items-center"
                    >
                      <FloatingInput
                        label="Description"
                        required
                        value={item.description}
                        onChange={(e) => {
                          const items = [...form.items];
                          items[i] = { ...items[i], description: e.target.value };
                          setForm({ ...form, items });
                        }}
                      />
                      <FloatingInput
                        label="Qty"
                        type="number"
                        value={String(item.quantity)}
                        onChange={(e) => {
                          const items = [...form.items];
                          items[i] = {
                            ...items[i],
                            quantity: Number(e.target.value),
                          };
                          setForm({ ...form, items });
                        }}
                      />
                      <FloatingInput
                        label="Rate"
                        type="number"
                        value={String(item.unitPrice)}
                        onChange={(e) => {
                          const items = [...form.items];
                          items[i] = {
                            ...items[i],
                            unitPrice: Number(e.target.value),
                          };
                          setForm({ ...form, items });
                        }}
                      />
                      <button
                        type="button"
                        disabled={form.items.length === 1}
                        onClick={() =>
                          setForm({
                            ...form,
                            items: form.items.filter((_, idx) => idx !== i),
                          })
                        }
                        className="size-11 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors disabled:opacity-30"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <FloatingInput
                    label="Currency"
                    value={form.currency}
                    onChange={(e) =>
                      setForm({ ...form, currency: e.target.value })
                    }
                  />
                  <FloatingInput
                    label="Discount"
                    type="number"
                    value={String(form.discount)}
                    onChange={(e) =>
                      setForm({ ...form, discount: Number(e.target.value) })
                    }
                  />
                  <FloatingInput
                    label="Due date"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                  />
                </div>

                <FloatingTextarea
                  label="Notes (payment instructions, terms…)"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />

                <div className="flex items-center justify-between rounded-2xl bg-white/3 border border-white/8 px-6 py-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Total
                  </span>
                  <span className="text-2xl font-black text-white tracking-tighter">
                    {form.currency} {totals.total}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 py-4.5 rounded-2xl font-black text-xs text-white uppercase tracking-widest transition-all shadow-lg shadow-accent/20 active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="animate-spin" size={16} />}
                  Create Invoice
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mark-paid modal */}
      <AnimatePresence>
        {payFor && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setPayFor(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md bg-card rounded-3xl border border-white/10 p-8 shadow-2xl space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-xl font-black text-white tracking-tight">
                  Mark {payFor.number} as paid
                </h2>
                <p className="text-xs text-gray-400 font-medium">
                  Record a payment received through any channel — this also
                  locks the client's package against a second charge.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">
                  Payment method
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-white text-sm outline-none focus:border-accent cursor-pointer"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m} className="bg-[#111827]">
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <FloatingInput
                label="Reference / transaction id (optional)"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setPayFor(null)}
                  className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white font-black text-[11px] uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={markPaid}
                  disabled={submitting}
                  className="flex-1 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  Confirm Paid
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={!!deletingId}
        title="Delete invoice"
        message="This invoice will be permanently removed. The client will no longer see it in their portal."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={submitting}
        onConfirm={deleteInvoice}
        onClose={() => setDeletingId(null)}
        type="danger"
      />
    </div>
  );
}
