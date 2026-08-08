"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Braces,
  Plus,
  Trash2,
  Upload,
  Download,
  Loader2,
  Search,
  Lock,
  Copy,
  Check,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { notify } from "@/lib/notify";
import FloatingInput from "@/Components/ui/FloatingInput";
import { Skeleton } from "@/Components/ui/Skeleton";
import ConfirmationModal from "@/Components/dashboard/ConfirmationModal";

export interface VariableRow {
  _id: string;
  key: string;
  label: string;
  group: string;
  path: string;
  sample: string;
  fallback: string;
  description: string;
  system: boolean;
  resolved: string | null;
}

export default function VariablesPage() {
  const [vars, setVars] = useState<VariableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<VariableRow | null>(null);
  const [editing, setEditing] = useState<Partial<VariableRow> | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/variables");
      if (data.success) setVars(data.variables || []);
    } catch (e: any) {
      notify.error("Could not load variables", e.response?.data?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? vars.filter(
          (v) =>
            v.key.toLowerCase().includes(q) ||
            (v.label || "").toLowerCase().includes(q) ||
            (v.group || "").toLowerCase().includes(q),
        )
      : vars;
    const map = new Map<string, VariableRow[]>();
    for (const v of filtered) {
      const g = v.group || "General";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(v);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [vars, query]);

  const save = async (row: Partial<VariableRow>) => {
    if (!row.key?.trim()) {
      notify.error("A key is required");
      return;
    }
    try {
      setBusy(true);
      const { data } = await axios.post("/api/variables", row);
      if (data.success) {
        notify.success(data.message);
        setEditing(null);
        load();
      } else notify.error("Save failed", data.message);
    } catch (e: any) {
      notify.error("Save failed", e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      setBusy(true);
      const { data } = await axios.delete(
        `/api/variables?key=${encodeURIComponent(deleting.key)}`,
      );
      if (data.success) {
        notify.success(data.message);
        setDeleting(null);
        load();
      } else notify.error("Delete failed", data.message);
    } catch (e: any) {
      notify.error("Delete failed", e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const importJson = async (file: File) => {
    try {
      setBusy(true);
      const text = await file.text();
      const parsed = JSON.parse(text);
      const { data } = await axios.post("/api/variables", parsed);
      if (data.success) {
        notify.success(
          data.message,
          data.skipped ? `${data.skipped} entries skipped` : undefined,
        );
        load();
      } else notify.error("Import failed", data.message);
    } catch (e: any) {
      notify.error("Import failed", e.message || "Invalid JSON file");
    } finally {
      setBusy(false);
    }
  };

  const copyToken = (key: string) => {
    navigator.clipboard?.writeText(`{{${key}}}`);
    setCopied(key);
    setTimeout(() => setCopied(null), 1400);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight flex items-center gap-4">
              <div className="size-12 rounded-xl bg-card flex items-center justify-center text-accent border border-white/10">
                <Braces size={24} />
              </div>
              Variables
            </h1>
            <p className="text-gray-400 font-medium text-sm max-w-2xl">
              Drop these into any PDF or email template as{" "}
              <code className="px-1.5 py-0.5 rounded bg-white/5 text-accent">
                {"{{key}}"}
              </code>
              . They're resolved on the server against the real record, so each
              client gets their own data.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 cursor-pointer transition-colors">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              Import JSON
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
              />
            </label>
            <a
              href="/api/variables/export"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors"
            >
              <Download size={13} /> Export JSON
            </a>
            <button
              onClick={() => setEditing({ group: "Custom" })}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              <Plus size={14} /> New Variable
            </button>
          </div>
        </header>

        <div className="relative max-w-md">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search variables…"
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white outline-none focus:border-accent transition-colors placeholder:text-gray-600"
          />
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-3xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map(([group, rows]) => (
              <section
                key={group}
                className="rounded-3xl border border-white/10 bg-card overflow-hidden"
              >
                <div className="px-7 py-4 border-b border-white/5 flex items-center justify-between">
                  <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-accent">
                    {group}
                  </h2>
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                    {rows.length} variable{rows.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="divide-y divide-white/5">
                  {rows.map((v) => (
                    <div
                      key={v.key}
                      /* Dragging a row drops "{{key}}" into any text field */
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", `{{${v.key}}}`);
                        e.dataTransfer.setData(
                          "application/x-variable",
                          `{{${v.key}}}`,
                        );
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      className="group flex flex-col sm:flex-row sm:items-center gap-4 px-7 py-4 hover:bg-white/3 transition-colors cursor-grab active:cursor-grabbing"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-black text-white">
                            {`{{${v.key}}}`}
                          </code>
                          {v.system && (
                            <span
                              title="Built-in"
                              className="text-gray-600"
                            >
                              <Lock size={11} />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5 truncate">
                          {v.label}
                          {v.path && v.path !== v.key && ` · ${v.path}`}
                        </p>
                      </div>

                      <div className="sm:w-64 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">
                          Resolves to
                        </p>
                        <p className="text-xs font-bold text-emerald-400 truncate">
                          {v.resolved != null && v.resolved !== ""
                            ? String(v.resolved)
                            : v.sample
                              ? `${v.sample} (sample)`
                              : "—"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => copyToken(v.key)}
                          title="Copy token"
                          className="size-9 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-accent transition-colors"
                        >
                          {copied === v.key ? (
                            <Check size={14} className="text-emerald-400" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => setEditing(v)}
                          className="px-4 h-9 rounded-xl bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleting(v)}
                          disabled={v.system}
                          className="size-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-25 disabled:hover:bg-red-500/10 disabled:hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {groups.length === 0 && (
              <div className="rounded-3xl border border-dashed border-white/10 py-20 text-center text-sm font-medium text-gray-500">
                No variables match "{query}".
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editor modal */}
      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setEditing(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 14 }}
              className="relative w-full max-w-xl rounded-3xl bg-card border border-white/10 p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white tracking-tight">
                  {editing._id ? "Edit variable" : "New variable"}
                </h2>
                <button
                  onClick={() => setEditing(null)}
                  className="size-9 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <X size={17} />
                </button>
              </div>

              <FloatingInput
                label="Key (used as {{key}})"
                value={editing.key || ""}
                disabled={!!editing.system}
                onChange={(e) => setEditing({ ...editing, key: e.target.value })}
              />
              <FloatingInput
                label="Label"
                value={editing.label || ""}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FloatingInput
                  label="Group"
                  value={editing.group || ""}
                  onChange={(e) => setEditing({ ...editing, group: e.target.value })}
                />
                <FloatingInput
                  label="Data path (e.g. invoice.total)"
                  value={editing.path || ""}
                  onChange={(e) => setEditing({ ...editing, path: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FloatingInput
                  label="Sample value"
                  value={editing.sample || ""}
                  onChange={(e) => setEditing({ ...editing, sample: e.target.value })}
                />
                <FloatingInput
                  label="Fallback when empty"
                  value={editing.fallback || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, fallback: e.target.value })
                  }
                />
              </div>

              <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                The data path points into the record the server builds — try{" "}
                <code className="text-accent">invoice.totalFormatted</code>,{" "}
                <code className="text-accent">client.email</code> or{" "}
                <code className="text-accent">site.name</code>.
              </p>

              <button
                onClick={() => save(editing)}
                disabled={busy}
                className="w-full py-4 rounded-2xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-black text-[11px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                Save variable
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={!!deleting}
        title="Delete variable"
        message={`Templates using {{${deleting?.key}}} will render it as empty. This cannot be undone.`}
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
