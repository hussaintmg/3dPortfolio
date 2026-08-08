"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Type,
  PaintBucket,
  Square,
  Move,
  Sparkles,
  RotateCcw,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Italic,
  Link2,
  Trash2,
  ExternalLink,
  Wand2,
  Play,
} from "lucide-react";
import { ANIMATION_PRESETS, EASINGS, DEFAULT_ANIMATION } from "@/lib/animations";
import { useSite } from "@/context/SiteContext";
import { ToggleTrack } from "@/Components/ui/Toggle";
import { cn } from "@/lib/cn";

const PANEL_W = 340;
const PANEL_H = 450;
const GAP = 14;

/** Common in-site destinations offered as one-tap presets. */
const LINK_PRESETS = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Services", href: "/services" },
  { label: "Packages", href: "/packages" },
  { label: "Contact", href: "/contact" },
  { label: "Portal", href: "/portal" },
];

const SWATCHES = [
  "#ffffff",
  "#e5e7eb",
  "#9ca3af",
  "#0b0f19",
  "#111827",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
];

type TabId = "text" | "fill" | "border" | "space" | "fx" | "motion" | "link";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "text", label: "Text", icon: <Type size={13} /> },
  { id: "fill", label: "Fill", icon: <PaintBucket size={13} /> },
  { id: "border", label: "Border", icon: <Square size={13} /> },
  { id: "space", label: "Space", icon: <Move size={13} /> },
  { id: "fx", label: "FX", icon: <Sparkles size={13} /> },
  { id: "motion", label: "Motion", icon: <Wand2 size={13} /> },
  { id: "link", label: "Link", icon: <Link2 size={13} /> },
];

/** Pill-shaped on/off switch used by the Link tab. */
function CapsuleToggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl border transition-colors text-left",
        checked
          ? "bg-accent/10 border-accent/40"
          : "bg-white/[0.03] border-white/10 hover:border-white/20",
      )}
    >
      <span className="min-w-0">
        <span
          className={cn(
            "block text-[10px] font-black uppercase tracking-widest",
            checked ? "text-accent" : "text-gray-400",
          )}
        >
          {label}
        </span>
        {hint && (
          <span className="block text-[9px] font-medium text-gray-600 mt-0.5">
            {hint}
          </span>
        )}
      </span>
      <ToggleTrack checked={checked} size="sm" />
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

function ColorControl({
  value,
  computed,
  onChange,
}: {
  value?: string;
  computed?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={
          /^#[0-9a-f]{6}$/i.test(value || "")
            ? (value as string)
            : rgbToHex(computed) || "#6366f1"
        }
        onChange={(e) => onChange(e.target.value)}
        className="size-7 rounded-lg border border-white/15 bg-transparent cursor-pointer p-0.5"
      />
      <button
        type="button"
        onClick={() => onChange("transparent")}
        title="Transparent"
        className="size-7 rounded-lg border border-white/15 bg-[repeating-conic-gradient(#555_0_25%,transparent_0_50%)] bg-[length:8px_8px] hover:border-accent transition-colors"
      />
      <button
        type="button"
        onClick={() => onChange("")}
        title="Reset to theme default"
        className="size-7 rounded-lg border border-white/15 text-gray-500 hover:text-white hover:border-accent transition-colors flex items-center justify-center"
      >
        <RotateCcw size={11} />
      </button>
    </div>
  );
}

function rgbToHex(rgb?: string): string | undefined {
  if (!rgb) return undefined;
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return /^#[0-9a-f]{6}$/i.test(rgb) ? rgb : undefined;
  return (
    "#" +
    [m[1], m[2], m[3]]
      .map((n) => Number(n).toString(16).padStart(2, "0"))
      .join("")
  );
}

const numFrom = (v?: string) => {
  if (!v) return "";
  const m = String(v).match(/-?\d+(\.\d+)?/);
  return m ? m[0] : "";
};

/**
 * Floating CSS editor for whatever element is selected on the page.
 * Positions itself above the selection when there is room, otherwise below.
 */
export default function StylePanel() {
  const {
    selection,
    select,
    getStyle,
    updateStyle,
    resetStyle,
    getLink,
    updateLink,
    removeLink,
    getAnimation,
    updateAnimation,
    removeAnimation,
    isEditing,
  } = useSite();
  const [tab, setTab] = useState<TabId>("text");
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const computed = useMemo(() => {
    if (!selection?.el || typeof window === "undefined") return null;
    return window.getComputedStyle(selection.el);
  }, [selection]);

  const current = (selection ? getStyle(selection.key) : undefined) || {};
  const link = selection ? getLink(selection.key) : undefined;
  const anim = selection ? getAnimation(selection.key) : undefined;

  /** Re-runs the element's keyframes so the owner can see the effect. */
  const previewAnimation = () => {
    const el = selection?.el;
    if (!el) return;
    el.classList.remove("anim-play");
    // force reflow so the animation restarts from frame 0
    void el.offsetWidth;
    el.classList.add("anim-play");
  };

  // Place the panel where it fits: above the element, else below, clamped.
  useLayoutEffect(() => {
    if (!selection?.el) {
      setPos(null);
      return;
    }
    const place = () => {
      const r = selection.el.getBoundingClientRect();
      const spaceAbove = r.top;
      const spaceBelow = window.innerHeight - r.bottom;
      let top: number;
      if (spaceAbove > PANEL_H + GAP) top = r.top - PANEL_H - GAP;
      else if (spaceBelow > PANEL_H + GAP) top = r.bottom + GAP;
      else top = Math.max(GAP, window.innerHeight - PANEL_H - GAP);

      let left = r.left + r.width / 2 - PANEL_W / 2;
      left = Math.max(GAP, Math.min(left, window.innerWidth - PANEL_W - GAP));
      setPos({ top: Math.max(GAP, top), left });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [selection]);

  // Clicking empty page space clears the selection
  useEffect(() => {
    if (!selection) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (panelRef.current?.contains(t)) return;
      if (t.closest("[data-editable-key]")) return;
      if (t.closest("[data-edit-bar]")) return;
      select(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [selection, select]);

  if (!mounted || !isEditing || !selection || !pos) return null;

  const set = (patch: Record<string, string>) =>
    updateStyle(selection.key, patch as any);

  const panel = (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        data-edit-bar
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        style={{ top: pos.top, left: pos.left, width: PANEL_W }}
        className="fixed z-[99] rounded-3xl bg-[#0d0d14]/97 backdrop-blur-2xl border border-white/12 shadow-[0_25px_70px_rgba(0,0,0,0.7)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <div className="min-w-0">
            <p className="text-[11px] font-black text-white uppercase tracking-widest truncate">
              {selection.label}
            </p>
            <p className="text-[9px] font-bold text-gray-600 truncate">
              {selection.key}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => resetStyle(selection.key)}
              title="Reset all styles on this element"
              className="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-white/5 transition-colors"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => select(null)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/8">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2.5 text-[9px] font-black uppercase tracking-widest transition-colors",
                tab === t.id
                  ? "text-accent bg-accent/10"
                  : "text-gray-600 hover:text-gray-300",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5 max-h-[300px] overflow-y-auto custom-scrollbar">
          {tab === "text" && (
            <>
              <Row label="Color">
                <ColorControl
                  value={current.color as string}
                  computed={computed?.color}
                  onChange={(v) => set({ color: v })}
                />
              </Row>
              <Row label="Size">
                <input
                  type="number"
                  placeholder={numFrom(computed?.fontSize)}
                  value={numFrom(current.fontSize as string)}
                  onChange={(e) =>
                    set({ fontSize: e.target.value ? `${e.target.value}px` : "" })
                  }
                  className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-accent"
                />
                <span className="text-[9px] text-gray-600 font-bold">PX</span>
              </Row>
              <Row label="Weight">
                <select
                  value={(current.fontWeight as string) || ""}
                  onChange={(e) => set({ fontWeight: e.target.value })}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-accent cursor-pointer"
                >
                  <option value="" className="bg-[#111827]">Default</option>
                  {["300", "400", "500", "600", "700", "800", "900"].map((w) => (
                    <option key={w} value={w} className="bg-[#111827]">
                      {w}
                    </option>
                  ))}
                </select>
              </Row>
              <Row label="Align">
                {[
                  { v: "left", icon: <AlignLeft size={13} /> },
                  { v: "center", icon: <AlignCenter size={13} /> },
                  { v: "right", icon: <AlignRight size={13} /> },
                ].map((a) => (
                  <button
                    key={a.v}
                    onClick={() =>
                      set({ textAlign: current.textAlign === a.v ? "" : a.v })
                    }
                    className={cn(
                      "size-7 rounded-lg border flex items-center justify-center transition-colors",
                      current.textAlign === a.v
                        ? "bg-accent text-white border-accent"
                        : "border-white/15 text-gray-400 hover:border-accent hover:text-white",
                    )}
                  >
                    {a.icon}
                  </button>
                ))}
              </Row>
              <Row label="Style">
                <button
                  onClick={() =>
                    set({
                      fontStyle: current.fontStyle === "italic" ? "" : "italic",
                    })
                  }
                  className={cn(
                    "size-7 rounded-lg border flex items-center justify-center transition-colors",
                    current.fontStyle === "italic"
                      ? "bg-accent text-white border-accent"
                      : "border-white/15 text-gray-400 hover:border-accent",
                  )}
                >
                  <Italic size={12} />
                </button>
                <button
                  onClick={() =>
                    set({
                      textDecoration:
                        current.textDecoration === "underline" ? "" : "underline",
                    })
                  }
                  className={cn(
                    "px-2 h-7 rounded-lg border text-[10px] font-black transition-colors underline",
                    current.textDecoration === "underline"
                      ? "bg-accent text-white border-accent"
                      : "border-white/15 text-gray-400 hover:border-accent",
                  )}
                >
                  U
                </button>
                <select
                  value={(current.textTransform as string) || ""}
                  onChange={(e) => set({ textTransform: e.target.value })}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-accent cursor-pointer"
                >
                  <option value="" className="bg-[#111827]">Aa</option>
                  <option value="uppercase" className="bg-[#111827]">AA</option>
                  <option value="lowercase" className="bg-[#111827]">aa</option>
                  <option value="capitalize" className="bg-[#111827]">Aa Bb</option>
                </select>
              </Row>
              <Row label="Spacing">
                <input
                  type="number"
                  step="0.5"
                  placeholder="0"
                  value={numFrom(current.letterSpacing as string)}
                  onChange={(e) =>
                    set({
                      letterSpacing: e.target.value ? `${e.target.value}px` : "",
                    })
                  }
                  className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-accent"
                />
                <span className="text-[9px] text-gray-600 font-bold">PX</span>
              </Row>
              <Row label="Line H">
                <input
                  type="number"
                  step="0.1"
                  placeholder="1.5"
                  value={numFrom(current.lineHeight as string)}
                  onChange={(e) => set({ lineHeight: e.target.value })}
                  className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-accent"
                />
              </Row>
            </>
          )}

          {tab === "fill" && (
            <>
              <Row label="Background">
                <ColorControl
                  value={current.backgroundColor as string}
                  computed={computed?.backgroundColor}
                  onChange={(v) => set({ backgroundColor: v })}
                />
              </Row>
              <div className="grid grid-cols-6 gap-1.5 pt-1">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={() => set({ backgroundColor: c })}
                    title={c}
                    style={{ backgroundColor: c }}
                    className="h-7 rounded-lg border border-white/15 hover:scale-110 transition-transform"
                  />
                ))}
              </div>
              <div className="pt-2 border-t border-white/5 space-y-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">
                  Gradient presets
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    "linear-gradient(135deg,#6366f1,#a855f7)",
                    "linear-gradient(135deg,#06b6d4,#3b82f6)",
                    "linear-gradient(135deg,#f59e0b,#ef4444)",
                    "linear-gradient(135deg,#10b981,#06b6d4)",
                    "linear-gradient(135deg,#ec4899,#8b5cf6)",
                    "linear-gradient(135deg,#0b0f19,#334155)",
                  ].map((g) => (
                    <button
                      key={g}
                      onClick={() => set({ backgroundImage: g })}
                      style={{ backgroundImage: g }}
                      className="h-8 rounded-lg border border-white/15 hover:scale-105 transition-transform"
                    />
                  ))}
                </div>
                <button
                  onClick={() => set({ backgroundImage: "" })}
                  className="w-full py-2 rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-white hover:border-accent transition-colors"
                >
                  Clear gradient
                </button>
              </div>
            </>
          )}

          {tab === "border" && (
            <>
              <Row label="Color">
                <ColorControl
                  value={current.borderColor as string}
                  computed={computed?.borderColor}
                  onChange={(v) =>
                    set({
                      borderColor: v,
                      // a colour is useless without a visible border
                      borderStyle:
                        (current.borderStyle as string) || "solid",
                      borderWidth:
                        (current.borderWidth as string) ||
                        (numFrom(computed?.borderWidth) === "0" ? "1px" : ""),
                    })
                  }
                />
              </Row>
              <Row label="Width">
                <input
                  type="number"
                  min={0}
                  placeholder={numFrom(computed?.borderWidth)}
                  value={numFrom(current.borderWidth as string)}
                  onChange={(e) =>
                    set({
                      borderWidth: e.target.value ? `${e.target.value}px` : "",
                      borderStyle: (current.borderStyle as string) || "solid",
                    })
                  }
                  className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-accent"
                />
                <span className="text-[9px] text-gray-600 font-bold">PX</span>
              </Row>
              <Row label="Style">
                <select
                  value={(current.borderStyle as string) || ""}
                  onChange={(e) => set({ borderStyle: e.target.value })}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-accent cursor-pointer"
                >
                  <option value="" className="bg-[#111827]">Default</option>
                  {["solid", "dashed", "dotted", "none"].map((s) => (
                    <option key={s} value={s} className="bg-[#111827]">
                      {s}
                    </option>
                  ))}
                </select>
              </Row>
              <Row label="Radius">
                <input
                  type="number"
                  min={0}
                  placeholder={numFrom(computed?.borderRadius)}
                  value={numFrom(current.borderRadius as string)}
                  onChange={(e) =>
                    set({
                      borderRadius: e.target.value ? `${e.target.value}px` : "",
                    })
                  }
                  className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-accent"
                />
                <span className="text-[9px] text-gray-600 font-bold">PX</span>
              </Row>
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {["0", "8", "16", "999"].map((r) => (
                  <button
                    key={r}
                    onClick={() => set({ borderRadius: `${r}px` })}
                    className="py-1.5 rounded-lg border border-white/10 text-[9px] font-black text-gray-400 hover:text-white hover:border-accent transition-colors"
                  >
                    {r === "999" ? "PILL" : r}
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === "space" && (
            <>
              <Row label="Padding">
                <input
                  type="number"
                  min={0}
                  placeholder={numFrom(computed?.padding)}
                  value={numFrom(current.padding as string)}
                  onChange={(e) =>
                    set({ padding: e.target.value ? `${e.target.value}px` : "" })
                  }
                  className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-accent"
                />
                <span className="text-[9px] text-gray-600 font-bold">PX</span>
              </Row>
              <Row label="Margin">
                <input
                  type="number"
                  placeholder="0"
                  value={numFrom(current.margin as string)}
                  onChange={(e) =>
                    set({ margin: e.target.value ? `${e.target.value}px` : "" })
                  }
                  className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-accent"
                />
                <span className="text-[9px] text-gray-600 font-bold">PX</span>
              </Row>
              <Row label="Max width">
                <input
                  type="number"
                  placeholder="auto"
                  value={numFrom(current.maxWidth as string)}
                  onChange={(e) =>
                    set({ maxWidth: e.target.value ? `${e.target.value}px` : "" })
                  }
                  className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-accent"
                />
                <span className="text-[9px] text-gray-600 font-bold">PX</span>
              </Row>
              <Row label="Justify">
                <select
                  value={(current.justifyContent as string) || ""}
                  onChange={(e) => set({ justifyContent: e.target.value })}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none focus:border-accent cursor-pointer"
                >
                  <option value="" className="bg-[#111827]">Default</option>
                  {["flex-start", "center", "flex-end", "space-between"].map((j) => (
                    <option key={j} value={j} className="bg-[#111827]">
                      {j}
                    </option>
                  ))}
                </select>
              </Row>
              <Row label="Gap">
                <input
                  type="number"
                  min={0}
                  placeholder={numFrom(computed?.gap)}
                  value={numFrom(current.gap as string)}
                  onChange={(e) =>
                    set({ gap: e.target.value ? `${e.target.value}px` : "" })
                  }
                  className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-accent"
                />
                <span className="text-[9px] text-gray-600 font-bold">PX</span>
              </Row>
            </>
          )}

          {tab === "fx" && (
            <>
              <Row label="Opacity">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Number(current.opacity ?? 1) * 100}
                  onChange={(e) =>
                    set({ opacity: String(Number(e.target.value) / 100) })
                  }
                  className="w-36 accent-accent"
                />
                <span className="text-[10px] font-black text-gray-400 w-8 text-right">
                  {Math.round(Number(current.opacity ?? 1) * 100)}%
                </span>
              </Row>
              <div className="space-y-2 pt-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">
                  Shadow
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "None", v: "none" },
                    { label: "Soft", v: "0 10px 30px rgba(0,0,0,0.35)" },
                    { label: "Glow", v: "0 0 30px rgba(99,102,241,0.45)" },
                    { label: "Deep", v: "0 25px 60px rgba(0,0,0,0.6)" },
                  ].map((s) => (
                    <button
                      key={s.label}
                      onClick={() => set({ boxShadow: s.v })}
                      className="py-2 rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-accent transition-colors"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => set({ boxShadow: "" })}
                  className="w-full py-2 rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                >
                  Reset shadow
                </button>
              </div>
            </>
          )}

          {tab === "motion" && (
            <>
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Entrance animation
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {ANIMATION_PRESETS.map((p) => {
                    const activePreset =
                      p.id === "none" ? !anim : anim?.type === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          if (p.id === "none") removeAnimation(selection.key);
                          else
                            updateAnimation(selection.key, {
                              ...DEFAULT_ANIMATION,
                              ...(anim || {}),
                              type: p.id,
                            });
                        }}
                        className={cn(
                          "py-2 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-colors",
                          activePreset
                            ? "bg-accent text-white border-accent"
                            : "border-white/10 text-gray-400 hover:text-white hover:border-accent",
                        )}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {anim && (
                <>
                  <Row label="Duration">
                    <input
                      type="number"
                      min={100}
                      max={5000}
                      step={50}
                      value={anim.duration}
                      onChange={(e) =>
                        updateAnimation(selection.key, {
                          duration: Number(e.target.value),
                        })
                      }
                      className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-accent"
                    />
                    <span className="text-[9px] text-gray-600 font-bold">MS</span>
                  </Row>
                  <Row label="Delay">
                    <input
                      type="number"
                      min={0}
                      max={5000}
                      step={50}
                      value={anim.delay}
                      onChange={(e) =>
                        updateAnimation(selection.key, {
                          delay: Number(e.target.value),
                        })
                      }
                      className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-accent"
                    />
                    <span className="text-[9px] text-gray-600 font-bold">MS</span>
                  </Row>
                  <Row label="Easing">
                    <select
                      value={anim.easing}
                      onChange={(e) =>
                        updateAnimation(selection.key, { easing: e.target.value })
                      }
                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-accent cursor-pointer"
                    >
                      {EASINGS.map((es) => (
                        <option key={es.id} value={es.id} className="bg-[#111827]">
                          {es.label}
                        </option>
                      ))}
                    </select>
                  </Row>

                  <CapsuleToggle
                    label="Replay on every scroll"
                    hint="Off = animate once only"
                    checked={!anim.once}
                    onChange={(v) =>
                      updateAnimation(selection.key, { once: !v })
                    }
                  />

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={previewAnimation}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent/10 border border-accent/25 text-accent text-[9px] font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-colors"
                    >
                      <Play size={11} /> Preview
                    </button>
                    <button
                      onClick={() => removeAnimation(selection.key)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-red-400 hover:border-red-400/40 transition-colors"
                    >
                      <Trash2 size={11} /> Remove
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {tab === "link" && (
            <>
              <CapsuleToggle
                label={link?.href ? "Link is on" : "Turn this into a link"}
                hint="Makes this element clickable"
                checked={!!link?.enabled && !!link?.href}
                onChange={(v) =>
                  updateLink(selection.key, {
                    enabled: v,
                    href: link?.href || "/",
                  })
                }
              />

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Destination
                </span>
                <input
                  type="text"
                  value={link?.href || ""}
                  placeholder="/projects or https://…"
                  onChange={(e) =>
                    updateLink(selection.key, {
                      href: e.target.value,
                      enabled: true,
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-accent transition-colors placeholder:text-gray-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {LINK_PRESETS.map((p) => (
                  <button
                    key={p.href}
                    onClick={() =>
                      updateLink(selection.key, {
                        href: p.href,
                        enabled: true,
                      })
                    }
                    className={cn(
                      "py-2 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-colors",
                      link?.href === p.href
                        ? "bg-accent text-white border-accent"
                        : "border-white/10 text-gray-400 hover:text-white hover:border-accent",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <CapsuleToggle
                label="Open in new tab"
                hint="Adds target=_blank safely"
                checked={!!link?.newTab}
                onChange={(v) => updateLink(selection.key, { newTab: v })}
              />

              {link?.href && (
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-accent transition-colors"
                  >
                    <ExternalLink size={11} /> Test
                  </a>
                  <button
                    onClick={() => removeLink(selection.key)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-red-400 hover:border-red-400/40 transition-colors"
                  >
                    <Trash2 size={11} /> Remove
                  </button>
                </div>
              )}

              <p className="text-[9px] font-medium text-gray-600 leading-relaxed pt-1">
                Internal paths start with <span className="text-gray-400">/</span>.
                External links need <span className="text-gray-400">https://</span>.
                Anything else is rejected on save.
              </p>
            </>
          )}
        </div>

        {selection.editableText && (
          <div className="px-4 py-2.5 border-t border-white/8 bg-white/2">
            <p className="text-[9px] font-bold text-gray-500 leading-relaxed">
              Tip: click into the text to rewrite it — changes save with the
              bar below.
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(panel, document.body);
}
