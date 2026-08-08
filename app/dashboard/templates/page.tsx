"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Mail,
  Plus,
  Copy,
  Trash2,
  Star,
  Loader2,
  PencilLine,
} from "lucide-react";
import axios from "axios";
import { notify } from "@/lib/notify";
import { Skeleton } from "@/Components/ui/Skeleton";
import ConfirmationModal from "@/Components/dashboard/ConfirmationModal";
import { cn } from "@/lib/cn";

interface Tpl {
  _id: string;
  name: string;
  type: "pdf" | "email";
  subject?: string;
  description?: string;
  isDefault: boolean;
  updatedAt: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Tpl | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/templates");
      if (data.success) setTemplates(data.templates || []);
    } catch (e: any) {
      notify.error("Could not load templates", e.response?.data?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (type: "pdf" | "email") => {
    try {
      setBusy(true);
      const { data } = await axios.post("/api/templates", {
        name: type === "pdf" ? "New PDF template" : "New email template",
        type,
        engine: type === "email" ? "html" : "designer",
      });
      if (data.success) {
        notify.success("Template created");
        window.location.href = `/dashboard/templates/${data.template._id}`;
      } else notify.error("Create failed", data.message);
    } catch (e: any) {
      notify.error("Create failed", e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async (t: Tpl) => {
    try {
      setBusy(true);
      const { data } = await axios.post("/api/templates", { duplicateOf: t._id });
      if (data.success) {
        notify.success("Duplicated");
        load();
      }
    } catch (e: any) {
      notify.error("Duplicate failed", e.response?.data?.message);
    } finally {
      setBusy(false);
    }
  };

  const makeDefault = async (t: Tpl) => {
    try {
      await axios.patch(`/api/templates/${t._id}`, { isDefault: true });
      notify.success(`"${t.name}" is now the default ${t.type} template`);
      load();
    } catch (e: any) {
      notify.error("Update failed", e.response?.data?.message);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      setBusy(true);
      await axios.delete(`/api/templates/${deleting._id}`);
      notify.success("Template deleted");
      setDeleting(null);
      load();
    } catch (e: any) {
      notify.error("Delete failed", e.response?.data?.message);
    } finally {
      setBusy(false);
    }
  };

  const groups: { type: "pdf" | "email"; label: string; icon: React.ReactNode }[] =
    [
      { type: "pdf", label: "PDF documents", icon: <FileText size={14} /> },
      { type: "email", label: "Emails", icon: <Mail size={14} /> },
    ];

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight flex items-center gap-4">
              <div className="size-12 rounded-xl bg-card flex items-center justify-center text-accent border border-white/10">
                <FileText size={24} />
              </div>
              Document Templates
            </h1>
            <p className="text-gray-400 font-medium text-sm max-w-2xl">
              Design invoices and emails once. They're filled with each
              client's real data on the server when a PDF is generated or an
              email is sent.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => create("pdf")}
              disabled={busy}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
            >
              <Plus size={14} /> New PDF
            </button>
            <button
              onClick={() => create("email")}
              disabled={busy}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <Plus size={14} /> New Email
            </button>
            <Link
              href="/dashboard/variables"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors"
            >
              Variables
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-3xl" />
            ))}
          </div>
        ) : (
          groups.map((g) => {
            const rows = templates.filter((t) => t.type === g.type);
            return (
              <section key={g.type} className="space-y-4">
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                  {g.icon} {g.label}
                </h2>

                {rows.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 py-14 text-center text-sm font-medium text-gray-500">
                    No {g.type} templates yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {rows.map((t) => (
                      <div
                        key={t._id}
                        className={cn(
                          "group rounded-3xl border bg-card p-7 space-y-5 transition-all hover:-translate-y-1",
                          t.isDefault
                            ? "border-amber-500/30"
                            : "border-white/8 hover:border-accent/30",
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-black text-white tracking-tight truncate">
                                {t.name}
                              </h3>
                              {t.isDefault && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[8px] font-black uppercase tracking-widest shrink-0">
                                  <Star size={8} fill="currentColor" /> Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 font-medium mt-1 line-clamp-2">
                              {t.description || t.subject || "—"}
                            </p>
                          </div>
                        </div>

                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                          Updated {new Date(t.updatedAt).toLocaleDateString()}
                        </p>

                        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                          <Link
                            href={`/dashboard/templates/${t._id}`}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                          >
                            <PencilLine size={13} /> Edit
                          </Link>
                          {!t.isDefault && (
                            <button
                              onClick={() => makeDefault(t)}
                              title="Make default"
                              className="size-11 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-amber-400 transition-colors"
                            >
                              <Star size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => duplicate(t)}
                            title="Duplicate"
                            className="size-11 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                          >
                            <Copy size={15} />
                          </button>
                          <button
                            onClick={() => setDeleting(t)}
                            className="size-11 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>

      <ConfirmationModal
        isOpen={!!deleting}
        title="Delete template"
        message={`"${deleting?.name}" will be removed. Anything using it falls back to the default template.`}
        confirmText="Delete"
        cancelText="Keep"
        isLoading={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
        type="danger"
      />
    </div>
  );
}
