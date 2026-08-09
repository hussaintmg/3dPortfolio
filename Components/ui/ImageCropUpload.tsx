"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  Upload,
  ZoomIn,
  ZoomOut,
  X,
  Check,
  Loader2,
  ImageIcon,
  Maximize2,
  Minimize2,
  RotateCcw,
} from "lucide-react";
import { notify } from "@/lib/notify";

/**
 * Zoom is expressed as a multiple of "the whole picture fits in the frame",
 * so 1 always means fit — whatever the picture's shape. Going below 1 shrinks
 * it inside the frame, which is what a logo on a padded app icon needs.
 */
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 8;

/** SVGs and some WebPs report no intrinsic size; assume a square canvas. */
const ASSUMED_SIZE = 512;

interface Props {
  /** Current image, shown as the preview. */
  value?: string;
  onChange: (url: string, storageKey: string) => void;
  /** width / height. 1 = square (app icons), 16/9 = banner, and so on. */
  ratio?: number;
  /** Longest edge of the produced PNG. */
  outputSize?: number;
  label?: string;
  hint?: string;
  /** Rounded preview for icons, square for banners. */
  round?: boolean;
}

/**
 * Upload an image and crop it to a fixed ratio before it is stored.
 *
 * The frame and the output canvas run off ONE geometry model — the same
 * `base * zoom` scale and the same offset, in the same units. They used to be
 * described twice: the canvas scaled the picture to fill the frame, while the
 * preview leaned on `max-width`/`object-fit`, which never enlarges a small
 * picture and never shrinks below the frame. Any image that wasn't already
 * frame-sized therefore came out looking far more zoomed in than it had, and
 * "fit" could not actually reach a fit.
 */
export default function ImageCropUpload({
  value,
  onChange,
  ratio = 1,
  outputSize = 512,
  label = "Image",
  hint,
  round = true,
}: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  /** Intrinsic pixels of the chosen file. Held in state so the preview
      re-renders the moment they are known. */
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  /** The frame's real, on-screen size — it shrinks on narrow phones. */
  const [frame, setFrame] = useState({ w: 0, h: 0 });

  const imgRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );

  useEffect(() => setMounted(true), []);

  // Revoking on unmount keeps blob urls from leaking between crops
  useEffect(() => {
    return () => {
      if (src?.startsWith("blob:")) URL.revokeObjectURL(src);
    };
  }, [src]);

  /**
   * Measure the frame rather than assuming the nominal 280px.
   *
   * On a narrow phone the modal's padding squeezes it, and a frame measured
   * wrong is a crop that doesn't match what was on screen.
   */
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setFrame({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [src]);

  const pick = (file: File) => {
    if (!file.type.startsWith("image/")) {
      notify.error("Not an image", "Choose a PNG, JPG, SVG or WebP file");
      return;
    }
    const max = Number(process.env.NEXT_PUBLIC_MAX_IMAGE_SIZE || 8) * 1024 * 1024;
    if (file.size > max) {
      notify.error("Too large", `Keep it under ${Math.round(max / 1024 / 1024)} MB`);
      return;
    }
    setNatural(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setSrc(URL.createObjectURL(file));
  };

  // ── Geometry — the single source of truth for BOTH preview and canvas ────
  const nw = natural?.w || 0;
  const nh = natural?.h || 0;
  /** Scale at which the whole picture just fits inside the frame. */
  const base = nw && nh && frame.w ? Math.min(frame.w / nw, frame.h / nh) : 0;
  /** Zoom multiple at which the picture just covers the frame, no gaps. */
  const fillZoom =
    nw && nh && frame.w ? Math.max(frame.w / nw, frame.h / nh) / base : 1;

  const drawW = nw * base * zoom;
  const drawH = nh * base * zoom;

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
  };
  const onUp = () => {
    dragRef.current = null;
  };

  /** Wheel zooms about the pointer, so the detail under the cursor stays put. */
  const onWheel = (e: React.WheelEvent) => {
    if (!base) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    // Pointer position relative to the frame's centre
    const px = e.clientX - rect.left - rect.width / 2;
    const py = e.clientY - rect.top - rect.height / 2;

    const next = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)),
    );
    const k = next / zoom;
    // Keep the picture point under the cursor anchored across the zoom
    setOffset((o) => ({ x: px - (px - o.x) * k, y: py - (py - o.y) * k }));
    setZoom(next);
  };

  /** Renders the visible crop to a canvas at the requested resolution. */
  const render = useCallback((): Promise<Blob | null> => {
    const img = imgRef.current;
    if (!img || !base || !frame.w) return Promise.resolve(null);

    const outW = ratio >= 1 ? outputSize : Math.round(outputSize * ratio);
    const outH = ratio >= 1 ? Math.round(outputSize / ratio) : outputSize;
    // Everything on screen is in frame pixels; scale it up to output pixels
    const k = outW / frame.w;

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Promise.resolve(null);

    ctx.imageSmoothingQuality = "high";

    // Identical to the preview: same drawW/drawH, same centre, same offset
    const dx = (outW - drawW * k) / 2 + offset.x * k;
    const dy = (outH - drawH * k) / 2 + offset.y * k;
    ctx.drawImage(img, dx, dy, drawW * k, drawH * k);

    return new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png", 0.95),
    );
  }, [ratio, outputSize, base, frame.w, drawW, drawH, offset]);

  const confirm = async () => {
    try {
      setBusy(true);
      const blob = await render();
      if (!blob) throw new Error("Could not render the crop");

      const fd = new FormData();
      fd.append("file", new File([blob], `icon-${outputSize}.png`, { type: "image/png" }));

      const res = await fetch("/api/upload", { method: "POST", body: fd }).then((r) =>
        r.json(),
      );
      if (!res.success) throw new Error(res.error || "Upload failed");

      onChange(res.publicUrl, res.filePath);
      notify.success("Image updated");
      setSrc(null);
    } catch (err: any) {
      notify.error("Upload failed", err.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = (z = 1) => {
    setZoom(z);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
        {label}
      </p>

      <div className="flex items-center gap-4 flex-wrap">
        <div
          className={`size-16 shrink-0 overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center ${
            round ? "rounded-2xl" : "rounded-lg"
          }`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={20} className="text-gray-700" />
          )}
        </div>

        <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer">
          <Upload size={13} />
          {value ? "Replace" : "Upload"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pick(f);
              e.target.value = "";
            }}
          />
        </label>

        {hint && (
          <p className="text-[11px] text-gray-500 font-medium leading-snug">{hint}</p>
        )}
      </div>

      {mounted &&
        src &&
        createPortal(
          <div className="fixed inset-0 z-[220] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d0d14] p-5 sm:p-6 space-y-5 max-h-[95vh] overflow-y-auto custom-scrollbar"
              data-lenis-prevent
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-white">Crop {label}</h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                    Drag to move · scroll to zoom ·{" "}
                    {ratio === 1 ? "square" : `${ratio.toFixed(2)}:1`} · {outputSize}px
                  </p>
                </div>
                <button
                  onClick={() => setSrc(null)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex justify-center">
                <div
                  ref={frameRef}
                  onPointerDown={onDown}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={onUp}
                  onWheel={onWheel}
                  style={{ width: "min(280px, 72vw)", aspectRatio: String(ratio) }}
                  className={`relative overflow-hidden bg-[repeating-conic-gradient(#1a1a24_0_25%,#12121a_0_50%)] bg-[length:16px_16px] border-2 border-accent/60 cursor-grab active:cursor-grabbing touch-none select-none ${
                    round ? "rounded-3xl" : "rounded-lg"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imgRef}
                    src={src}
                    alt=""
                    draggable={false}
                    onLoad={(e) => {
                      const el = e.currentTarget;
                      setNatural({
                        w: el.naturalWidth || ASSUMED_SIZE,
                        h: el.naturalHeight || ASSUMED_SIZE,
                      });
                    }}
                    style={{
                      position: "absolute",
                      // Explicit pixels — exactly what the canvas will draw.
                      // No max-width/object-fit, which cannot enlarge a small
                      // picture and so disagreed with the output.
                      width: drawW || 1,
                      height: drawH || 1,
                      left: "50%",
                      top: "50%",
                      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                      maxWidth: "none",
                      maxHeight: "none",
                      visibility: base ? "visible" : "hidden",
                    }}
                  />
                  {/* Rule-of-thirds guides, like any crop tool */}
                  <div className="absolute inset-0 pointer-events-none opacity-40">
                    <div className="absolute left-1/3 inset-y-0 w-px bg-white/40" />
                    <div className="absolute left-2/3 inset-y-0 w-px bg-white/40" />
                    <div className="absolute top-1/3 inset-x-0 h-px bg-white/40" />
                    <div className="absolute top-2/3 inset-x-0 h-px bg-white/40" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.2))}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  title="Zoom out"
                >
                  <ZoomOut size={15} />
                </button>
                <input
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(+e.target.value)}
                  className="flex-1 accent-[#0083fe] cursor-pointer"
                />
                <button
                  onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.2))}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  title="Zoom in"
                >
                  <ZoomIn size={15} />
                </button>
                <span className="text-[10px] font-black text-gray-500 tabular-nums w-11 text-right shrink-0">
                  {zoom.toFixed(2)}×
                </span>
              </div>

              {/* Fit shows everything; Fill leaves no transparent edges */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => reset(1)}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 font-black text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
                  title="Show the whole image"
                >
                  <Minimize2 size={12} /> Fit
                </button>
                <button
                  onClick={() => reset(fillZoom)}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 font-black text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
                  title="Fill the frame edge to edge"
                >
                  <Maximize2 size={12} /> Fill
                </button>
                <button
                  onClick={() => reset(1)}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 font-black text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
                  title="Undo panning and zooming"
                >
                  <RotateCcw size={12} /> Reset
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={confirm}
                  disabled={busy || !base}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-black text-[11px] uppercase tracking-widest transition-colors cursor-pointer"
                >
                  {busy ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Use this
                </button>
                <button
                  onClick={() => setSrc(null)}
                  disabled={busy}
                  className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white font-black text-[11px] uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>,
          document.body,
        )}
    </div>
  );
}
