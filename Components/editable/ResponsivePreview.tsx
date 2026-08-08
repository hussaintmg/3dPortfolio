"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCw,
  X,
  Laptop,
  RefreshCw,
} from "lucide-react";

interface Device {
  id: string;
  label: string;
  w: number;
  h: number;
  icon: typeof Monitor;
}

const DEVICES: Device[] = [
  { id: "mobile-s", label: "iPhone SE", w: 375, h: 667, icon: Smartphone },
  { id: "mobile", label: "iPhone 14", w: 390, h: 844, icon: Smartphone },
  { id: "mobile-l", label: "Pixel 7 Pro", w: 412, h: 892, icon: Smartphone },
  { id: "tablet", label: "iPad Mini", w: 768, h: 1024, icon: Tablet },
  { id: "tablet-l", label: "iPad Pro", w: 1024, h: 1366, icon: Tablet },
  { id: "laptop", label: "Laptop", w: 1280, h: 800, icon: Laptop },
  { id: "desktop", label: "Desktop", w: 1440, h: 900, icon: Monitor },
];

const MIN_W = 240;
const MAX_W = 2560;

/**
 * A devtools-style responsive tester.
 *
 * The page is loaded in an iframe rather than just being squeezed in place,
 * because only a real viewport makes media queries, `100vw` and fixed
 * positioning behave the way they will on a phone. The left and right edges
 * are invisible drag handles: grab either one and the frame resizes about
 * its centre, exactly like the devtools device toolbar.
 */
export default function ResponsivePreview({ onClose }: { onClose: () => void }) {
  const pathname = usePathname() || "/";
  const [mounted, setMounted] = useState(false);
  const [width, setWidth] = useState(390);
  const [height, setHeight] = useState(844);
  const [dragging, setDragging] = useState<null | "left" | "right" | "bottom">(null);
  const [nonce, setNonce] = useState(0);
  const [available, setAvailable] = useState({ w: 1200, h: 800 });

  const startRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const measure = () =>
      setAvailable({ w: window.innerWidth - 120, h: window.innerHeight - 190 });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Escape closes, like every other overlay in the app
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const beginDrag = (edge: "left" | "right" | "bottom") => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY, w: width, h: height };
    setDragging(edge);
  };

  const onMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging) return;
      const s = startRef.current;
      if (dragging === "bottom") {
        setHeight(Math.max(320, Math.min(4000, s.h + (e.clientY - s.y))));
        return;
      }
      // Resizing about the centre means one pixel of travel moves two of width
      const delta = (e.clientX - s.x) * 2;
      const next = dragging === "right" ? s.w + delta : s.w - delta;
      setWidth(Math.round(Math.max(MIN_W, Math.min(MAX_W, next))));
    },
    [dragging],
  );

  useEffect(() => {
    if (!dragging) return;
    const stop = () => setDragging(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    // Keep the resize cursor while the pointer roams outside the handle
    document.body.style.cursor = dragging === "bottom" ? "ns-resize" : "ew-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging, onMove]);

  if (!mounted) return null;

  // Shrink to fit rather than overflow the window at large widths
  const scale = Math.min(1, available.w / width, available.h / height);
  const active = DEVICES.find((d) => d.w === width && d.h === height);

  const handleBase =
    "absolute top-0 bottom-0 w-4 z-20 flex items-center justify-center group";

  return createPortal(
    <div
      data-editor-ui
      className="fixed inset-0 z-[200] bg-[#07070c]/97 backdrop-blur-md flex flex-col"
    >
      {/* ── toolbar ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#0d0d14]">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent mr-1">
          Responsive
        </span>

        <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1 border border-white/10">
          {DEVICES.map((d) => {
            const Icon = d.icon;
            const on = active?.id === d.id;
            return (
              <button
                key={d.id}
                title={`${d.label} · ${d.w}×${d.h}`}
                onClick={() => {
                  setWidth(d.w);
                  setHeight(d.h);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                  on
                    ? "bg-accent text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon size={12} />
                <span className="hidden lg:inline">{d.w}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 ml-1">
          <input
            type="number"
            value={width}
            onChange={(e) =>
              setWidth(Math.max(MIN_W, Math.min(MAX_W, +e.target.value || MIN_W)))
            }
            className="w-16 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[11px] font-bold text-center outline-none focus:border-accent"
          />
          <span className="text-gray-600 text-[11px]">×</span>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Math.max(320, +e.target.value || 320))}
            className="w-16 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-[11px] font-bold text-center outline-none focus:border-accent"
          />
        </div>

        <button
          onClick={() => {
            setWidth(height);
            setHeight(width);
          }}
          title="Rotate"
          className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <RotateCw size={13} />
        </button>
        <button
          onClick={() => setNonce((n) => n + 1)}
          title="Reload frame"
          className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <RefreshCw size={13} />
        </button>

        <span className="text-[10px] font-bold text-gray-600 tabular-nums ml-1">
          {scale < 1 ? `${Math.round(scale * 100)}% zoom` : "100%"}
        </span>

        <button
          onClick={onClose}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-red-500/15 hover:text-red-400 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
        >
          <X size={13} /> Close
        </button>
      </div>

      {/* ── stage ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-8">
        <div
          className="relative shrink-0"
          style={{
            width: width * scale,
            height: height * scale + 26,
          }}
        >
          <div className="absolute left-1/2 -translate-x-1/2 -top-1 text-[10px] font-black text-gray-500 tabular-nums tracking-widest">
            {width} × {height}
          </div>

          <div
            className="absolute left-0 top-[26px] origin-top-left"
            style={{
              width,
              height,
              transform: `scale(${scale})`,
            }}
          >
            <iframe
              ref={frameRef}
              key={nonce}
              src={pathname}
              title="Responsive preview"
              className="w-full h-full rounded-xl bg-background border border-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.7)]"
              style={{ pointerEvents: dragging ? "none" : "auto" }}
            />
          </div>

          {/* Invisible drag bars — they only show a tint on hover, and the
              cursor is the affordance, exactly like the devtools handles. */}
          <div
            onPointerDown={beginDrag("left")}
            className={`${handleBase} left-[-16px] cursor-ew-resize`}
            style={{ top: 26 }}
          >
            <span className="h-14 w-1 rounded-full bg-white/0 group-hover:bg-accent transition-colors" />
          </div>
          <div
            onPointerDown={beginDrag("right")}
            className={`${handleBase} right-[-16px] cursor-ew-resize`}
            style={{ top: 26 }}
          >
            <span className="h-14 w-1 rounded-full bg-white/0 group-hover:bg-accent transition-colors" />
          </div>
          <div
            onPointerDown={beginDrag("bottom")}
            className="absolute left-0 right-0 h-4 -bottom-4 z-20 flex items-center justify-center group cursor-ns-resize"
          >
            <span className="w-14 h-1 rounded-full bg-white/0 group-hover:bg-accent transition-colors" />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
