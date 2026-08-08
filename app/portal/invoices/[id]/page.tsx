"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, AlertTriangle, Building2 } from "lucide-react";
import PdfDownloadButton from "@/Components/documents/PdfDownloadButton";
import PayInvoicePanel from "@/Components/payments/PayInvoicePanel";
import axios from "axios";
import { useSite } from "@/context/SiteContext";
import { Skeleton } from "@/Components/ui/Skeleton";
import { StatusPill } from "../../page";

interface Invoice {
  _id: string;
  number: string;
  clientName: string;
  clientEmail: string;
  packageName?: string;
  items: { description: string; quantity: number; unitPrice: number }[];
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
  issuedAt?: string;
  dueDate?: string;
  paidAt?: string;
}

export default function InvoiceDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { settings } = useSite();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    axios
      .get(`/api/invoices/${id}`)
      .then((r) => {
        if (!alive) return;
        if (r.data.success) setInvoice(r.data.invoice);
        else setError(r.data.message || "Invoice not found");
      })
      .catch((e) =>
        setError(e.response?.data?.message || "Could not load this invoice"),
      )
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  const overdue =
    invoice &&
    invoice.status !== "paid" &&
    invoice.status !== "cancelled" &&
    invoice.dueDate &&
    new Date(invoice.dueDate).getTime() < Date.now();

  if (loading)
    return (
      <div className="p-4 sm:p-6 md:p-10 space-y-8 pt-20 lg:pt-10 max-w-4xl">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );

  if (error || !invoice)
    return (
      <div className="p-4 sm:p-6 md:p-10 pt-20 lg:pt-10">
        <div className="max-w-md rounded-3xl border border-red-500/20 bg-red-500/5 p-8 space-y-4 text-center">
          <AlertTriangle size={26} className="mx-auto text-red-400" />
          <p className="text-sm font-bold text-white">{error}</p>
          <Link
            href="/portal/invoices"
            className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-accent hover:text-white transition-colors"
          >
            <ArrowLeft size={13} /> Back to invoices
          </Link>
        </div>
      </div>
    );

  return (
    <div className="p-4 sm:p-6 md:p-10 pt-20 lg:pt-10">
      {/* Screen-only toolbar */}
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 mb-6 print:hidden">
        <Link
          href="/portal/invoices"
          className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> All invoices
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            title="Print this page"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
          >
            <Printer size={14} /> Print
          </button>
          {/* Server-generated PDF; owner gets template controls on hover */}
          <PdfDownloadButton
            invoiceId={invoice._id}
            filename={`${invoice.number}.pdf`}
          />
        </div>
      </div>

      {/* How to pay — hidden once the invoice is settled */}
      <div className="max-w-4xl mx-auto mb-6">
        <PayInvoicePanel
          invoiceId={invoice._id}
          invoiceNumber={invoice.number}
          amount={invoice.total}
          currency={invoice.currency}
          paid={invoice.status === "paid"}
        />
      </div>

      {/* The printable document */}
      <article
        id="invoice-sheet"
        className="max-w-4xl mx-auto rounded-3xl border border-white/8 bg-card overflow-hidden print:rounded-none print:border-0"
      >
        {/* Header */}
        <div className="p-8 sm:p-10 border-b border-white/8 flex flex-col sm:flex-row justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-accent flex items-center justify-center text-white font-black">
                {settings.websiteName.slice(0, 1)}
              </div>
              <div>
                <p className="text-lg font-black text-white tracking-tight">
                  {settings.websiteName}
                </p>
                <p className="text-[10px] font-bold text-gray-500">
                  {settings.email}
                </p>
              </div>
            </div>
            {settings.address && (
              <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5 pt-2">
                <Building2 size={11} /> {settings.address}
              </p>
            )}
          </div>

          <div className="sm:text-right space-y-2">
            <p className="text-2xl font-black text-white tracking-tighter">
              {invoice.number}
            </p>
            <div className="sm:flex sm:justify-end">
              <StatusPill status={overdue ? "overdue" : invoice.status} />
            </div>
            {invoice.issuedAt && (
              <p className="text-[11px] text-gray-500 font-medium">
                Issued {new Date(invoice.issuedAt).toLocaleDateString()}
              </p>
            )}
            {invoice.dueDate && (
              <p
                className={`text-[11px] font-bold ${overdue ? "text-red-400" : "text-gray-500"}`}
              >
                Due {new Date(invoice.dueDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Bill to */}
        <div className="px-8 sm:px-10 py-6 border-b border-white/8 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 mb-2">
              Billed to
            </p>
            <p className="text-sm font-black text-white">
              {invoice.clientName || "Client"}
            </p>
            <p className="text-xs text-gray-500 font-medium">
              {invoice.clientEmail}
            </p>
          </div>
          {invoice.packageName && (
            <div className="sm:text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 mb-2">
                Package
              </p>
              <p className="text-sm font-black text-white">
                {invoice.packageName}
              </p>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="px-8 sm:px-10 py-6">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/8">
                <th className="pb-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">
                  Description
                </th>
                <th className="pb-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 text-center w-20">
                  Qty
                </th>
                <th className="pb-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 text-right w-28">
                  Rate
                </th>
                <th className="pb-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 text-right w-28">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {invoice.items?.map((item, i) => (
                <tr key={i}>
                  <td className="py-4 text-sm font-medium text-gray-200">
                    {item.description}
                  </td>
                  <td className="py-4 text-sm font-medium text-gray-400 text-center">
                    {item.quantity}
                  </td>
                  <td className="py-4 text-sm font-medium text-gray-400 text-right">
                    {invoice.currency} {item.unitPrice}
                  </td>
                  <td className="py-4 text-sm font-black text-white text-right">
                    {invoice.currency} {item.quantity * item.unitPrice}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-full sm:w-64 space-y-2.5">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>Subtotal</span>
                <span>
                  {invoice.currency} {invoice.subtotal}
                </span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-xs font-bold text-emerald-400">
                  <span>Discount</span>
                  <span>
                    − {invoice.currency} {invoice.discount}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-white/10">
                <span className="text-sm font-black text-white uppercase tracking-widest">
                  Total
                </span>
                <span className="text-xl font-black text-white tracking-tighter">
                  {invoice.currency} {invoice.total}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment info / notes */}
        {(invoice.notes || invoice.paymentMethod || invoice.paidAt) && (
          <div className="px-8 sm:px-10 py-6 border-t border-white/8 space-y-3">
            {invoice.paidAt && (
              <p className="text-xs font-bold text-emerald-400">
                Paid on {new Date(invoice.paidAt).toLocaleDateString()}
                {invoice.paymentMethod && ` · ${invoice.paymentMethod}`}
                {invoice.paymentReference && ` · Ref ${invoice.paymentReference}`}
              </p>
            )}
            {invoice.notes && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 mb-1.5">
                  Notes
                </p>
                <p className="text-xs text-gray-400 font-medium leading-relaxed whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="px-8 sm:px-10 py-5 border-t border-white/8 bg-white/2 print:bg-transparent">
          <p className="text-[10px] text-gray-600 font-medium text-center">
            Thank you for your business — {settings.websiteName}
          </p>
        </div>
      </article>
    </div>
  );
}
