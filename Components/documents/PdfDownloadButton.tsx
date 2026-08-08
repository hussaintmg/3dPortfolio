"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Download,
  Loader2,
  PencilLine,
  FileText,
  Check,
  Send,
} from "lucide-react";
import axios from "axios";
import { useSite } from "@/context/SiteContext";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/cn";

interface Tpl {
  _id: string;
  name: string;
  type: "pdf" | "email";
  isDefault: boolean;
}

interface Props {
  invoiceId?: string;
  filename?: string;
  label?: string;
  className?: string;
  /** Show the "email it" action alongside download (staff surfaces). */
  allowEmail?: boolean;
}

const STORAGE_KEY = "pdf-template-choice";

/**
 * Download button that generates the PDF on the server.
 *
 * While the owner is in maintenance mode, hovering reveals a panel to switch
 * the PDF template or jump straight into the template editor.
 */
export default function PdfDownloadButton({
  invoiceId,
  filename = "document.pdf",
  label = "Download PDF",
  className,
  allowEmail = false,
}: Props) {
  const { canEdit } = useSite();
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [chosen, setChosen] = useState<string>("");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setChosen(saved);
    } catch {}
  }, []);

  // Only the owner in maintenance mode ever needs the template list
  const loadTemplates = useCallback(async () => {
    if (!canEdit || templates.length > 0) return;
    try {
      const { data } = await axios.get("/api/templates");
      if (data.success) setTemplates(data.templates || []);
    } catch {
      // panel simply shows nothing to switch to
    }
  }, [canEdit, templates.length]);

  const download = async () => {
    try {
      setBusy(true);
      const res = await fetch("/api/documents/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, templateId: chosen || undefined }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        notify.error("Could not generate PDF", err.message || res.statusText);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      notify.error("Could not generate PDF", e.message);
    } finally {
      setBusy(false);
    }
  };

  const emailIt = async () => {
    try {
      setSending(true);
      const { data } = await axios.post("/api/documents/email", {
        invoiceId,
        pdfTemplateId: chosen || undefined,
        attachPdf: true,
      });
      if (data.success) notify.success("Email sent", data.message);
      else notify.error("Send failed", data.message);
    } catch (e: any) {
      notify.error("Send failed", e.response?.data?.message || e.message);
    } finally {
      setSending(false);
    }
  };

  const pdfTemplates = templates.filter((t) => t.type === "pdf");

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => {
        if (!canEdit) return;
        if (closeTimer.current) clearTimeout(closeTimer.current);
        loadTemplates();
        setOpen(true);
      }}
      onMouseLeave={() => {
        if (!canEdit) return;
        closeTimer.current = setTimeout(() => setOpen(false), 220);
      }}
    >
      <button
        onClick={download}
        disabled={busy}
        className={cn(
          "inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white text-[11px] font-black uppercase tracking-widest hover:bg-accent-hover transition-all active:scale-95 disabled:opacity-60",
          className,
        )}
      >
        {busy ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Download size={14} />
        )}
        {label}
      </button>

      {/* Owner-only quick controls */}
      {canEdit && open && (
        <div
          data-edit-bar
          className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl bg-[#0d0d14]/97 backdrop-blur-2xl border border-white/12 shadow-[0_25px_70px_rgba(0,0,0,0.7)] overflow-hidden print:hidden"
        >
          <div className="px-4 py-3 border-b border-white/8">
            <p className="text-[10px] font-black uppercase tracking-widest text-accent">
              PDF template
            </p>
            <p className="text-[9px] text-gray-600 font-medium mt-0.5">
              Pick the layout used for this download
            </p>
          </div>

          <div className="max-h-52 overflow-y-auto custom-scrollbar py-1.5">
            {pdfTemplates.length === 0 ? (
              <p className="px-4 py-3 text-[10px] text-gray-600 font-bold">
                No templates loaded.
              </p>
            ) : (
              pdfTemplates.map((t) => {
                const active = chosen ? chosen === t._id : t.isDefault;
                return (
                  <button
                    key={t._id}
                    onClick={() => {
                      setChosen(t._id);
                      try {
                        localStorage.setItem(STORAGE_KEY, t._id);
                      } catch {}
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors",
                      active
                        ? "bg-accent/10 text-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <FileText size={13} className="shrink-0" />
                    <span className="text-[11px] font-bold truncate flex-1">
                      {t.name}
                    </span>
                    {active && <Check size={13} className="text-accent shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="p-2 border-t border-white/8 space-y-1.5">
            <Link
              href={
                chosen
                  ? `/dashboard/templates/${chosen}`
                  : pdfTemplates.find((t) => t.isDefault)
                    ? `/dashboard/templates/${pdfTemplates.find((t) => t.isDefault)!._id}`
                    : "/dashboard/templates"
              }
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-accent hover:text-white text-gray-300 text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              <PencilLine size={13} /> Edit this PDF
            </Link>

            {allowEmail && invoiceId && (
              <button
                onClick={emailIt}
                disabled={sending}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                Email with PDF attached
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
