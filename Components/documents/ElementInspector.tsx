"use client";

import { useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Copy,
  RotateCw,
  Upload,
  Loader2,
} from "lucide-react";
import { DesignElement, ShapeKind } from "@/lib/pdfDesigner";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/cn";

const SHAPES: { id: ShapeKind; label: string }[] = [
  { id: "rect", label: "Rectangle" },
  { id: "ellipse", label: "Ellipse" },
  { id: "triangle", label: "Triangle" },
  { id: "diamond", label: "Diamond" },
  { id: "star", label: "Star" },
  { id: "hexagon", label: "Hexagon" },
  { id: "arrow", label: "Arrow" },
];

const GRADIENTS = [
  "linear-gradient(135deg,#6366f1,#a855f7)",
  "linear-gradient(135deg,#06b6d4,#3b82f6)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#10b981,#06b6d4)",
  "linear-gradient(135deg,#0b0f19,#334155)",
  "linear-gradient(135deg,#ec4899,#8b5cf6)",
];

interface Props {
  element: DesignElement | null;
  onChange: (patch: Partial<DesignElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 shrink-0">
      {label}
    </span>
    <div className="flex items-center gap-1.5">{children}</div>
  </div>
);

const num = (v?: string) => {
  const m = String(v ?? "").match(/-?\d+(\.\d+)?/);
  return m ? m[0] : "";
};

const inputCls =
  "w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-accent";

/** Right-hand properties panel: geometry, typography, colours, spacing. */
export default function ElementInspector({
  element,
  onChange,
  onDelete,
  onDuplicate,
}: Props) {
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "templates");
      const res = await fetch("/api/upload", { method: "POST", body: fd }).then(
        (r) => r.json(),
      );
      if (res.success) return res.publicUrl as string;
      notify.error("Upload failed", res.error);
      return null;
    } catch (e: any) {
      notify.error("Upload failed", e.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  if (!element) {
    return (
      <div className="w-72 shrink-0 border-l border-white/8 bg-[#0d0d14] p-6">
        <p className="text-[11px] font-bold text-gray-600 leading-relaxed">
          Select an element on the page to edit it, or drop a variable onto a
          text, image or QR element to bind real data.
        </p>
      </div>
    );
  }

  const st = element.style || {};
  const setStyle = (patch: Record<string, string>) => {
    const next = { ...st, ...patch };
    Object.keys(patch).forEach((k) => {
      if (patch[k] === "") delete next[k];
    });
    onChange({ style: next });
  };
  const setProps = (patch: Record<string, any>) =>
    onChange({ props: { ...element.props, ...patch } });

  const isText = element.type === "text";
  const hasFill = element.type === "shape" || element.type === "line" || isText;

  return (
    <div className="w-72 shrink-0 border-l border-white/8 bg-[#0d0d14] overflow-y-auto custom-scrollbar" data-lenis-prevent>
      <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-widest text-white">
            {element.type}
          </p>
          <p className="text-[9px] font-bold text-gray-600">{element.id}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onDuplicate}
            title="Duplicate"
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Content */}
        {isText && (
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-accent">
              Content
            </span>
            <textarea
              value={element.props.text || ""}
              onChange={(e) => setProps({ text: e.target.value })}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const token =
                  e.dataTransfer.getData("application/x-variable") ||
                  e.dataTransfer.getData("text/plain");
                if (!token) return;
                e.preventDefault();
                setProps({ text: (element.props.text || "") + token });
              }}
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-accent resize-none custom-scrollbar font-mono"
            />
            <p className="text-[9px] text-gray-600 font-medium">
              HTML allowed. Drop a variable here to insert its token.
            </p>
          </div>
        )}

        {element.type === "image" && (
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-accent">
              Image source
            </span>
            <input
              value={element.props.src || ""}
              onChange={(e) => setProps({ src: e.target.value })}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const token =
                  e.dataTransfer.getData("application/x-variable") ||
                  e.dataTransfer.getData("text/plain");
                if (token) {
                  e.preventDefault();
                  setProps({ src: token });
                }
              }}
              placeholder="https://… or {{site.logo}}"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-accent font-mono"
            />
            <label className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 cursor-pointer transition-colors">
              {uploading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Upload size={12} />
              )}
              Upload image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const url = await uploadImage(f);
                  if (url) setProps({ src: url });
                }}
              />
            </label>
            <Field label="Fit">
              <select
                value={st.objectFit || "contain"}
                onChange={(e) => setStyle({ objectFit: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-accent cursor-pointer"
              >
                {["contain", "cover", "fill", "none"].map((f) => (
                  <option key={f} value={f} className="bg-[#111827]">
                    {f}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {element.type === "qr" && (
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-accent">
              QR destination
            </span>
            <input
              value={element.props.url || ""}
              onChange={(e) => setProps({ url: e.target.value })}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const token =
                  e.dataTransfer.getData("application/x-variable") ||
                  e.dataTransfer.getData("text/plain");
                if (token) {
                  e.preventDefault();
                  setProps({ url: token });
                }
              }}
              placeholder="{{invoice.url}}"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-accent font-mono"
            />
            <p className="text-[9px] text-gray-600 font-medium">
              The code image is generated on the server at render time.
            </p>
          </div>
        )}

        {element.type === "shape" && (
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-accent">
              Shape
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {SHAPES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setProps({ shape: s.id })}
                  className={cn(
                    "py-2 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-colors",
                    (element.props.shape || "rect") === s.id
                      ? "bg-accent text-white border-accent"
                      : "border-white/10 text-gray-400 hover:text-white hover:border-accent",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">
                Gradient fill
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {GRADIENTS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setStyle({ backgroundImage: g })}
                    style={{ backgroundImage: g }}
                    className="h-7 rounded-lg border border-white/15 hover:scale-105 transition-transform"
                  />
                ))}
              </div>
              <button
                onClick={() => setStyle({ backgroundImage: "" })}
                className="w-full py-1.5 rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
              >
                Clear gradient
              </button>
            </div>
          </div>
        )}

        {element.type === "table" && (
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-accent">
              Columns (pipe separated)
            </span>
            <input
              value={element.props.columns || ""}
              onChange={(e) => setProps({ columns: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-accent font-mono"
            />
            <p className="text-[9px] text-gray-600 font-medium">
              Rows come from the invoice's line items automatically.
            </p>
          </div>
        )}

        {/* Geometry */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <span className="text-[10px] font-black uppercase tracking-widest text-accent">
            Position &amp; size
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(["x", "y", "w", "h"] as const).map((k) => (
              <div key={k} className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-gray-600 w-3">
                  {k}
                </span>
                <input
                  type="number"
                  value={element[k]}
                  onChange={(e) => onChange({ [k]: Number(e.target.value) } as any)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-accent"
                />
              </div>
            ))}
          </div>
          <Field label="Rotation">
            <RotateCw size={12} className="text-gray-600" />
            <input
              type="number"
              value={element.rotation || 0}
              onChange={(e) => onChange({ rotation: Number(e.target.value) })}
              className={inputCls}
            />
            <span className="text-[9px] text-gray-600 font-bold">DEG</span>
          </Field>
          <Field label="Name">
            <input
              value={element.name || ""}
              placeholder={element.type}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-32 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-accent"
            />
          </Field>
        </div>

        {/* Typography */}
        {isText && (
          <div className="space-y-3 pt-4 border-t border-white/5">
            <span className="text-[10px] font-black uppercase tracking-widest text-accent">
              Typography
            </span>
            <Field label="Size">
              <input
                type="number"
                value={num(st.fontSize)}
                onChange={(e) =>
                  setStyle({ fontSize: e.target.value ? `${e.target.value}px` : "" })
                }
                className={inputCls}
              />
              <span className="text-[9px] text-gray-600 font-bold">PX</span>
            </Field>
            <Field label="Style">
              <button
                onClick={() =>
                  setStyle({ fontWeight: st.fontWeight === "700" ? "400" : "700" })
                }
                className={cn(
                  "size-7 rounded-lg border flex items-center justify-center transition-colors",
                  st.fontWeight === "700" || st.fontWeight === "800"
                    ? "bg-accent text-white border-accent"
                    : "border-white/15 text-gray-400 hover:border-accent",
                )}
              >
                <Bold size={12} />
              </button>
              <button
                onClick={() =>
                  setStyle({ fontStyle: st.fontStyle === "italic" ? "" : "italic" })
                }
                className={cn(
                  "size-7 rounded-lg border flex items-center justify-center transition-colors",
                  st.fontStyle === "italic"
                    ? "bg-accent text-white border-accent"
                    : "border-white/15 text-gray-400 hover:border-accent",
                )}
              >
                <Italic size={12} />
              </button>
              <button
                onClick={() =>
                  setStyle({
                    textDecoration:
                      st.textDecoration === "underline" ? "" : "underline",
                  })
                }
                className={cn(
                  "size-7 rounded-lg border flex items-center justify-center transition-colors",
                  st.textDecoration === "underline"
                    ? "bg-accent text-white border-accent"
                    : "border-white/15 text-gray-400 hover:border-accent",
                )}
              >
                <Underline size={12} />
              </button>
            </Field>
            <Field label="Align">
              {[
                { v: "left", icon: <AlignLeft size={12} /> },
                { v: "center", icon: <AlignCenter size={12} /> },
                { v: "right", icon: <AlignRight size={12} /> },
              ].map((a) => (
                <button
                  key={a.v}
                  onClick={() =>
                    setStyle({ textAlign: st.textAlign === a.v ? "" : a.v })
                  }
                  className={cn(
                    "size-7 rounded-lg border flex items-center justify-center transition-colors",
                    st.textAlign === a.v
                      ? "bg-accent text-white border-accent"
                      : "border-white/15 text-gray-400 hover:border-accent",
                  )}
                >
                  {a.icon}
                </button>
              ))}
            </Field>
            <Field label="Line height">
              <input
                type="number"
                step="0.1"
                value={num(st.lineHeight)}
                onChange={(e) => setStyle({ lineHeight: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Text colour">
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(st.color || "") ? st.color : "#111827"}
                onChange={(e) => setStyle({ color: e.target.value })}
                className="size-7 rounded-lg border border-white/15 bg-transparent cursor-pointer p-0.5"
              />
            </Field>
          </div>
        )}

        {/* Fill & border */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <span className="text-[10px] font-black uppercase tracking-widest text-accent">
            Fill &amp; border
          </span>
          {hasFill && (
            <Field label="Background">
              <input
                type="color"
                value={
                  /^#[0-9a-f]{6}$/i.test(st.backgroundColor || "")
                    ? st.backgroundColor
                    : "#6366f1"
                }
                onChange={(e) => setStyle({ backgroundColor: e.target.value })}
                className="size-7 rounded-lg border border-white/15 bg-transparent cursor-pointer p-0.5"
              />
              <button
                onClick={() => setStyle({ backgroundColor: "" })}
                className="px-2 h-7 rounded-lg border border-white/15 text-[9px] font-black uppercase text-gray-400 hover:text-white hover:border-accent transition-colors"
              >
                None
              </button>
            </Field>
          )}
          <Field label="Radius">
            <input
              type="number"
              value={num(st.borderRadius)}
              onChange={(e) =>
                setStyle({ borderRadius: e.target.value ? `${e.target.value}px` : "" })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Border">
            <input
              type="number"
              min={0}
              value={num(st.borderWidth)}
              onChange={(e) =>
                setStyle({
                  borderWidth: e.target.value ? `${e.target.value}px` : "",
                  borderStyle: e.target.value ? "solid" : "",
                })
              }
              className={inputCls}
            />
            <input
              type="color"
              value={
                /^#[0-9a-f]{6}$/i.test(st.borderColor || "") ? st.borderColor : "#e5e7eb"
              }
              onChange={(e) => setStyle({ borderColor: e.target.value })}
              className="size-7 rounded-lg border border-white/15 bg-transparent cursor-pointer p-0.5"
            />
          </Field>
        </div>

        {/* Spacing */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <span className="text-[10px] font-black uppercase tracking-widest text-accent">
            Spacing
          </span>
          <Field label="Padding">
            <input
              type="number"
              min={0}
              value={num(st.padding)}
              onChange={(e) =>
                setStyle({ padding: e.target.value ? `${e.target.value}px` : "" })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Margin">
            <input
              type="number"
              value={num(st.margin)}
              onChange={(e) =>
                setStyle({ margin: e.target.value ? `${e.target.value}px` : "" })
              }
              className={inputCls}
            />
          </Field>
          <Field label="Opacity">
            <input
              type="range"
              min={0}
              max={100}
              value={Number(st.opacity ?? 1) * 100}
              onChange={(e) =>
                setStyle({ opacity: String(Number(e.target.value) / 100) })
              }
              className="w-28 accent-accent"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
