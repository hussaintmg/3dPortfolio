"use client";

import { useCallback, useEffect, useMemo, useRef, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Type,
  Image as ImageIcon,
  Square,
  Minus,
  QrCode,
  Table,
  Save,
  Loader2,
  Eye,
  Code2,
  MousePointer2,
  Download,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  Braces,
  Star,
  Send,
  Undo2,
  Redo2,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Settings2,
} from "lucide-react";
import axios from "axios";
import { notify } from "@/lib/notify";
import {
  DesignDoc,
  DesignElement,
  ElementType,
  PAGE_PRESETS,
  PAGE_PRESET_LABELS,
  designToHtml,
  elementDefaults,
  emptyDesign,
  htmlToDesign,
} from "@/lib/pdfDesigner";
import DesignerCanvas from "@/Components/documents/DesignerCanvas";
import ElementInspector from "@/Components/documents/ElementInspector";
import LayersPanel from "@/Components/documents/LayersPanel";
import { Skeleton } from "@/Components/ui/Skeleton";
import { cn } from "@/lib/cn";

type Tab = "designer" | "html" | "preview";

const PALETTE: { type: ElementType; label: string; icon: React.ReactNode }[] = [
  { type: "text", label: "Text", icon: <Type size={15} /> },
  { type: "image", label: "Image", icon: <ImageIcon size={15} /> },
  { type: "shape", label: "Shape", icon: <Square size={15} /> },
  { type: "line", label: "Line", icon: <Minus size={15} /> },
  { type: "qr", label: "QR code", icon: <QrCode size={15} /> },
  { type: "table", label: "Table", icon: <Table size={15} /> },
];

export default function TemplateEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("designer");
  const [zoom, setZoom] = useState(0.7);

  const [name, setName] = useState("");
  const [type, setType] = useState<"pdf" | "email">("pdf");
  const [subject, setSubject] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [design, setDesign] = useState<DesignDoc>(emptyDesign());
  const [html, setHtml] = useState("");
  const [css, setCss] = useState("");
  const [engine, setEngine] = useState<"designer" | "html">("designer");
  /** False when hand-written HTML can no longer be mapped back to elements. */
  const [syncOk, setSyncOk] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [variables, setVariables] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [previewInvoice, setPreviewInvoice] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [pageOpen, setPageOpen] = useState(false);

  // ── load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [tplRes, varRes, invRes] = await Promise.all([
          axios.get(`/api/templates/${id}`),
          axios.get("/api/variables").catch(() => null),
          axios.get("/api/invoices").catch(() => null),
        ]);

        if (tplRes.data.success) {
          const t = tplRes.data.template;
          setName(t.name);
          setType(t.type);
          setSubject(t.subject || "");
          setIsDefault(!!t.isDefault);
          setCss(t.css || "");
          setEngine(t.engine || "designer");

          const d: DesignDoc =
            t.design?.elements?.length ? t.design : emptyDesign();
          setDesign(d);
          setHtml(t.html || designToHtml(d, ""));
          if (t.type === "email" || t.engine === "html") setTab("html");
        }
        if (varRes?.data?.success) setVariables(varRes.data.variables || []);
        if (invRes?.data?.success) {
          setInvoices(invRes.data.invoices || []);
          if (invRes.data.invoices?.[0])
            setPreviewInvoice(invRes.data.invoices[0]._id);
        }
      } catch (e: any) {
        notify.error("Could not load template", e.response?.data?.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ── history ───────────────────────────────────────────────────────────────
  const [past, setPast] = useState<DesignDoc[]>([]);
  const [future, setFuture] = useState<DesignDoc[]>([]);
  /** Snapshot taken at the start of a drag so a whole gesture is one undo. */
  const gestureBase = useRef<DesignDoc | null>(null);
  const designRef = useRef(design);
  designRef.current = design;

  const writeDesign = useCallback((next: DesignDoc) => {
    setDesign(next);
    setHtml(designToHtml(next, ""));
    setEngine("designer");
    setSyncOk(true);
  }, []);

  /** Discrete change — recorded on the undo stack immediately. */
  const applyDesign = useCallback(
    (next: DesignDoc) => {
      setPast((p) => [...p.slice(-49), designRef.current]);
      setFuture([]);
      writeDesign(next);
    },
    [writeDesign],
  );

  /** Continuous change during a drag — one history entry per gesture. */
  const liveDesign = useCallback(
    (next: DesignDoc) => {
      if (!gestureBase.current) gestureBase.current = designRef.current;
      writeDesign(next);
    },
    [writeDesign],
  );

  const commitGesture = useCallback(() => {
    if (!gestureBase.current) return;
    const base = gestureBase.current;
    gestureBase.current = null;
    setPast((p) => [...p.slice(-49), base]);
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [designRef.current, ...f.slice(0, 49)]);
      writeDesign(prev);
      return p.slice(0, -1);
    });
  }, [writeDesign]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setPast((p) => [...p, designRef.current]);
      writeDesign(next);
      return f.slice(1);
    });
  }, [writeDesign]);

  /** HTML edit → parse it back into elements when it is still representable. */
  const applyHtml = useCallback(
    (next: string) => {
      setHtml(next);
      setEngine("html");
      const parsed = htmlToDesign(next, design.page);
      if (parsed && parsed.elements.length > 0) {
        setDesign(parsed);
        setSyncOk(true);
      } else {
        // Free-form markup: keep it, but say the designer can't mirror it
        setSyncOk(false);
      }
    },
    [design.page],
  );

  const selected = useMemo(
    () => design.elements.find((e) => e.id === selectedId) || null,
    [design.elements, selectedId],
  );

  const addElement = (t: ElementType) => {
    const el = elementDefaults(t, design.elements);
    applyDesign({ ...design, elements: [...design.elements, el] });
    setSelectedId(el.id);
    setTab("designer");
  };

  const patchSelected = (patch: any) => {
    if (!selected) return;
    applyDesign({
      ...design,
      elements: design.elements.map((e) =>
        e.id === selected.id ? { ...e, ...patch } : e,
      ),
    });
  };

  const deleteSelected = () => {
    if (!selected) return;
    applyDesign({
      ...design,
      elements: design.elements.filter((e) => e.id !== selected.id),
    });
    setSelectedId(null);
  };

  const duplicateSelected = () => {
    if (!selected) return;
    const copy = {
      ...selected,
      id: elementDefaults(selected.type, design.elements).id,
      name: `${selected.name || selected.type} copy`,
      x: selected.x + 16,
      y: selected.y + 16,
    };
    applyDesign({ ...design, elements: [...design.elements, copy] });
    setSelectedId(copy.id);
  };

  /** Layers panel drag-to-restack (array order == paint order). */
  const reorderLayer = (from: number, to: number) => {
    const next = [...design.elements];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    applyDesign({ ...design, elements: next });
  };

  const patchById = (id: string, p: Partial<DesignElement>) =>
    applyDesign({
      ...design,
      elements: design.elements.map((e) => (e.id === id ? { ...e, ...p } : e)),
    });

  /** Align the selected element against the printable area. */
  const align = (
    what: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom",
  ) => {
    if (!selected) return;
    const pad = design.page.padding;
    const map: Record<string, Partial<DesignElement>> = {
      left: { x: pad },
      hcenter: { x: Math.round((design.page.width - selected.w) / 2) },
      right: { x: design.page.width - pad - selected.w },
      top: { y: pad },
      vcenter: { y: Math.round((design.page.height - selected.h) / 2) },
      bottom: { y: design.page.height - pad - selected.h },
    };
    patchById(selected.id, map[what]);
  };

  // ── keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
        return;
      }

      if (typing || tab !== "designer" || !selected) return;

      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        return;
      }
      // Arrow keys nudge; Shift makes it a bigger step
      const step = e.shiftKey ? 10 : 1;
      const moves: Record<string, Partial<DesignElement>> = {
        ArrowLeft: { x: selected.x - step },
        ArrowRight: { x: selected.x + step },
        ArrowUp: { y: selected.y - step },
        ArrowDown: { y: selected.y + step },
      };
      if (moves[e.key]) {
        e.preventDefault();
        patchById(selected.id, moves[e.key]);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, tab, design, undo, redo]);

  // ── preview / save / export ───────────────────────────────────────────────
  const runPreview = useCallback(async () => {
    try {
      setPreviewing(true);
      const { data } = await axios.post("/api/documents/render", {
        html,
        css,
        design,
        engine,
        invoiceId: previewInvoice || undefined,
      });
      if (data.success) setPreviewHtml(data.html);
      else notify.error("Preview failed", data.message);
    } catch (e: any) {
      notify.error("Preview failed", e.response?.data?.message || e.message);
    } finally {
      setPreviewing(false);
    }
  }, [html, css, design, engine, previewInvoice]);

  useEffect(() => {
    if (tab === "preview") runPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, previewInvoice]);

  const save = async () => {
    try {
      setSaving(true);
      const { data } = await axios.patch(`/api/templates/${id}`, {
        name,
        subject,
        html,
        css,
        design,
        engine,
        isDefault,
      });
      if (data.success) notify.success("Template saved");
      else notify.error("Save failed", data.message);
    } catch (e: any) {
      notify.error("Save failed", e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async () => {
    try {
      setPreviewing(true);
      const res = await fetch("/api/documents/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: id, invoiceId: previewInvoice || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        notify.error("PDF failed", err.message || res.statusText);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name.replace(/[^a-z0-9]+/gi, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      notify.success("PDF generated");
    } catch (e: any) {
      notify.error("PDF failed", e.message);
    } finally {
      setPreviewing(false);
    }
  };

  const sendTest = async () => {
    try {
      setSendingTest(true);
      const { data } = await axios.post("/api/documents/email", {
        emailTemplateId: id,
        invoiceId: previewInvoice || undefined,
        attachPdf: false,
      });
      if (data.success) notify.success("Test sent", data.message);
      else notify.error("Send failed", data.message);
    } catch (e: any) {
      notify.error("Send failed", e.response?.data?.message || e.message);
    } finally {
      setSendingTest(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen p-8 space-y-6">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-[70vh] w-full rounded-3xl" />
      </div>
    );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Toolbar */}
      <header className="shrink-0 border-b border-white/8 bg-[#0d0d14]">
        <div className="flex items-center gap-4 px-5 py-3">
          <Link
            href="/dashboard/templates"
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-transparent text-lg font-black text-white outline-none border-b border-transparent focus:border-accent transition-colors min-w-0 flex-1 max-w-xs"
          />

          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-400">
            {type}
          </span>

          <button
            onClick={() => setIsDefault(!isDefault)}
            title="Use as the default template"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-colors",
              isDefault
                ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                : "border-white/10 text-gray-500 hover:text-white",
            )}
          >
            <Star size={11} fill={isDefault ? "currentColor" : "none"} />
            Default
          </button>

          <div className="flex-1" />

          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {[
              { id: "designer" as Tab, label: "Designer", icon: <MousePointer2 size={13} /> },
              { id: "html" as Tab, label: "HTML", icon: <Code2 size={13} /> },
              { id: "preview" as Tab, label: "Preview", icon: <Eye size={13} /> },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors",
                  tab === t.id
                    ? "bg-accent text-white"
                    : "text-gray-400 hover:text-white",
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {type === "pdf" ? (
            <button
              onClick={downloadPdf}
              disabled={previewing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {previewing ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Test PDF
            </button>
          ) : (
            <button
              onClick={sendTest}
              disabled={sendingTest}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {sendingTest ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Send test
            </button>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save
          </button>
        </div>

        {/* Second row: element palette + data selector */}
        <div className="flex items-center gap-3 px-5 py-2.5 border-t border-white/5 overflow-x-auto custom-scrollbar">
          {type === "pdf" && (
            <>
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 shrink-0">
                Add
              </span>
              {PALETTE.map((p) => (
                <button
                  key={p.type}
                  onClick={() => addElement(p.type)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-gray-300 hover:text-white hover:border-accent transition-colors shrink-0"
                >
                  {p.icon}
                  {p.label}
                </button>
              ))}
              <div className="w-px h-5 bg-white/10 shrink-0" />

              {/* History */}
              <button
                onClick={undo}
                disabled={past.length === 0}
                title="Undo (Ctrl+Z)"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-25 shrink-0"
              >
                <Undo2 size={14} />
              </button>
              <button
                onClick={redo}
                disabled={future.length === 0}
                title="Redo (Ctrl+Shift+Z)"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-25 shrink-0"
              >
                <Redo2 size={14} />
              </button>

              <div className="w-px h-5 bg-white/10 shrink-0" />

              {/* Align the selection to the page */}
              {[
                { k: "left" as const, icon: <AlignStartVertical size={13} />, t: "Align left" },
                { k: "hcenter" as const, icon: <AlignCenterVertical size={13} />, t: "Centre horizontally" },
                { k: "right" as const, icon: <AlignEndVertical size={13} />, t: "Align right" },
                { k: "top" as const, icon: <AlignStartHorizontal size={13} />, t: "Align top" },
                { k: "vcenter" as const, icon: <AlignCenterHorizontal size={13} />, t: "Centre vertically" },
                { k: "bottom" as const, icon: <AlignEndHorizontal size={13} />, t: "Align bottom" },
              ].map((a) => (
                <button
                  key={a.k}
                  onClick={() => align(a.k)}
                  disabled={!selected}
                  title={a.t}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-25 shrink-0"
                >
                  {a.icon}
                </button>
              ))}

              <div className="w-px h-5 bg-white/10 shrink-0" />

              <button
                onClick={() => setPageOpen((v) => !v)}
                title="Page setup"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-colors shrink-0",
                  pageOpen
                    ? "bg-accent text-white border-accent"
                    : "bg-white/5 border-white/10 text-gray-300 hover:text-white",
                )}
              >
                <Settings2 size={13} /> Page
              </button>

              <div className="w-px h-5 bg-white/10 shrink-0" />
              <button
                onClick={() => setZoom((z) => Math.max(0.3, +(z - 0.1).toFixed(2)))}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 shrink-0"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-[10px] font-black text-gray-400 w-10 text-center shrink-0">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 shrink-0"
              >
                <ZoomIn size={14} />
              </button>
              <div className="w-px h-5 bg-white/10 shrink-0" />
            </>
          )}

          <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 shrink-0">
            Preview data
          </span>
          <select
            value={previewInvoice}
            onChange={(e) => setPreviewInvoice(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-accent cursor-pointer shrink-0"
          >
            <option value="" className="bg-[#111827]">No record (samples)</option>
            {invoices.map((i) => (
              <option key={i._id} value={i._id} className="bg-[#111827]">
                {i.number} — {i.clientName}
              </option>
            ))}
          </select>
        </div>

        {/* Page setup */}
        {pageOpen && type === "pdf" && (
          <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-t border-white/5 bg-white/2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">
                Size
              </span>
              <select
                value={
                  Object.entries(PAGE_PRESETS).find(
                    ([, v]) =>
                      v.width === design.page.width &&
                      v.height === design.page.height,
                  )?.[0] || "custom"
                }
                onChange={(e) => {
                  const preset = (PAGE_PRESETS as any)[e.target.value];
                  if (!preset) return;
                  applyDesign({
                    ...design,
                    page: { ...design.page, ...preset },
                  });
                }}
                className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-accent cursor-pointer"
              >
                {Object.keys(PAGE_PRESETS).map((k) => (
                  <option key={k} value={k} className="bg-[#111827]">
                    {PAGE_PRESET_LABELS[k] || k}
                  </option>
                ))}
                <option value="custom" className="bg-[#111827]">
                  Custom
                </option>
              </select>
            </div>

            {(["width", "height", "padding"] as const).map((k) => (
              <div key={k} className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">
                  {k}
                </span>
                <input
                  type="number"
                  value={design.page[k]}
                  onChange={(e) =>
                    applyDesign({
                      ...design,
                      page: { ...design.page, [k]: Number(e.target.value) },
                    })
                  }
                  className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white outline-none focus:border-accent"
                />
              </div>
            ))}

            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">
                Background
              </span>
              <input
                type="color"
                value={
                  /^#[0-9a-f]{6}$/i.test(design.page.background)
                    ? design.page.background
                    : "#ffffff"
                }
                onChange={(e) =>
                  applyDesign({
                    ...design,
                    page: { ...design.page, background: e.target.value },
                  })
                }
                className="size-7 rounded-lg border border-white/15 bg-transparent cursor-pointer p-0.5"
              />
            </div>
          </div>
        )}

        {!syncOk && (
          <div className="flex items-center gap-2 px-5 py-2 bg-amber-500/10 border-t border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-widest">
            <AlertTriangle size={12} />
            This HTML has no designer elements — the Designer tab can't mirror
            it. Rendering will use your HTML exactly as written.
          </div>
        )}
      </header>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Variables palette */}
        <aside className="w-60 shrink-0 border-r border-white/8 bg-[#0d0d14] overflow-y-auto custom-scrollbar" data-lenis-prevent>
          <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
            <Braces size={13} className="text-accent" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">
              Variables
            </span>
          </div>
          <p className="px-4 py-3 text-[10px] text-gray-600 font-medium leading-relaxed">
            Drag onto an element, or into any text box, to insert its token.
          </p>
          <div className="pb-4 max-h-[38vh] overflow-y-auto custom-scrollbar">
            {variables.map((v) => (
              <div
                key={v.key}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", `{{${v.key}}}`);
                  e.dataTransfer.setData("application/x-variable", `{{${v.key}}}`);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                className="px-4 py-2 hover:bg-white/5 cursor-grab active:cursor-grabbing border-l-2 border-transparent hover:border-accent transition-colors"
              >
                <p className="text-[11px] font-black text-white truncate">
                  {`{{${v.key}}}`}
                </p>
                <p className="text-[9px] text-gray-600 font-medium truncate">
                  {v.resolved || v.sample || v.label}
                </p>
              </div>
            ))}
          </div>

          {type === "pdf" && (
            <LayersPanel
              elements={design.elements}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onReorder={reorderLayer}
              onPatch={patchById}
            />
          )}
        </aside>

        {/* Main area */}
        {tab === "designer" && type === "pdf" && (
          <>
            <DesignerCanvas
              design={design}
              selectedId={selectedId}
              zoom={zoom}
              onSelect={setSelectedId}
              onChange={liveDesign}
              onCommit={commitGesture}
            />
            <ElementInspector
              element={selected}
              onChange={patchSelected}
              onDelete={deleteSelected}
              onDuplicate={duplicateSelected}
            />
          </>
        )}

        {tab === "designer" && type === "email" && (
          <div className="flex-1 flex items-center justify-center p-10 text-center">
            <p className="text-sm text-gray-500 font-medium max-w-sm">
              Email templates are written as HTML — switch to the HTML tab.
            </p>
          </div>
        )}

        {tab === "html" && (
          <div className="flex-1 flex flex-col min-w-0">
            {type === "email" && (
              <div className="px-5 py-3 border-b border-white/8">
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const t = e.dataTransfer.getData("text/plain");
                    if (t) {
                      e.preventDefault();
                      setSubject(subject + t);
                    }
                  }}
                  placeholder="Email subject — variables allowed"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-accent"
                />
              </div>
            )}
            <textarea
              value={html}
              onChange={(e) => applyHtml(e.target.value)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const token = e.dataTransfer.getData("text/plain");
                if (!token) return;
                e.preventDefault();
                const ta = e.currentTarget;
                const pos = ta.selectionStart ?? html.length;
                applyHtml(html.slice(0, pos) + token + html.slice(pos));
              }}
              spellCheck={false}
              className="flex-1 bg-[#0a0a12] text-emerald-200 font-mono text-xs p-5 outline-none resize-none custom-scrollbar leading-relaxed"
              data-lenis-prevent
            />
            <div className="border-t border-white/8">
              <div className="px-5 py-2 text-[9px] font-black uppercase tracking-widest text-gray-600">
                Extra CSS
              </div>
              <textarea
                value={css}
                onChange={(e) => setCss(e.target.value)}
                spellCheck={false}
                rows={5}
                className="w-full bg-[#0a0a12] text-sky-200 font-mono text-xs px-5 pb-4 outline-none resize-none custom-scrollbar"
              />
            </div>
          </div>
        )}

        {tab === "preview" && (
          <div className="flex-1 bg-[#0a0a12] p-6 overflow-auto custom-scrollbar" data-lenis-prevent>
            {previewing ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-accent" size={32} />
              </div>
            ) : (
              <iframe
                title="Template preview"
                srcDoc={previewHtml}
                className="w-full bg-white rounded-xl shadow-2xl mx-auto block"
                style={{
                  width: type === "pdf" ? design.page.width : 700,
                  height: type === "pdf" ? design.page.height : 900,
                  maxWidth: "100%",
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
