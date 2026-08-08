"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Upload, ZoomIn, X, Check, Loader2, ImageIcon } from "lucide-react";
import { notify } from "@/lib/notify";

/** How far out the frame can be zoomed — 0.4 leaves generous padding. */
const MIN_ZOOM = 0.4;

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
 * App icons have to be square or the OS letterboxes them, so instead of
 * asking for a correctly-sized file we take any image and let the owner pan
 * and zoom inside the target frame. What gets uploaded is the crop, already
 * at the right dimensions.
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
  // Below 1 the picture sits inside the frame with padding — useful for a
  // logo that shouldn't touch the edges of an app icon.
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const naturalRef = useRef({ w: 0, h: 0 });

  useEffect(() => setMounted(true), []);

  // Revoking on unmount keeps blob urls from leaking between crops
  useEffect(() => {
    return () => {
      if (src?.startsWith("blob:")) URL.revokeObjectURL(src);
    };
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
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setSrc(URL.createObjectURL(file));
  };

  const onDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
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

  /** Renders the visible crop to a canvas at the requested resolution. */
  const render = useCallback((): Promise<Blob | null> => {
    const frame = frameRef.current;
    const img = imgRef.current;
    if (!frame || !img) return Promise.resolve(null);

    const fw = frame.clientWidth;
    const fh = frame.clientHeight;
    const { w: nw, h: nh } = naturalRef.current;
    if (!nw || !nh) return Promise.resolve(null);

    const outW = ratio >= 1 ? outputSize : Math.round(outputSize * ratio);
    const outH = ratio >= 1 ? Math.round(outputSize / ratio) : outputSize;
    // Everything on screen is in frame pixels; scale it up to output pixels
    const k = outW / fw;

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Promise.resolve(null);

    ctx.imageSmoothingQuality = "high";

    /**
     * "contain", not "cover".
     *
     * Covering the frame means a wide photo is cropped to its middle strip
     * before you touch anything — which is why every upload looked heavily
     * zoomed in and there was no way back out. Starting contained shows the
     * whole picture; zoom in from there if you want a tighter crop.
     */
    const base = Math.min(fw / nw, fh / nh);
    const scale = base * zoom;
    const drawW = nw * scale * k;
    const drawH = nh * scale * k;
    const dx = (outW - drawW) / 2 + offset.x * k;
    const dy = (outH - drawH) / 2 + offset.y * k;

    ctx.drawImage(img, dx, dy, drawW, drawH);

    return new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png", 0.95),
    );
  }, [ratio, outputSize, zoom, offset]);

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

  const frameW = 280;
  const frameH = Math.round(frameW / ratio);

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
        {label}
      </p>

      <div className="flex items-center gap-4">
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
              className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d0d14] p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-white">Crop {label}</h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                    Drag to move · {ratio === 1 ? "square" : `${ratio.toFixed(2)}:1`} ·{" "}
                    {outputSize}px
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
                  style={{ width: frameW, height: frameH }}
                  className={`relative overflow-hidden bg-black/60 border-2 border-accent/60 cursor-grab active:cursor-grabbing touch-none ${
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
                      naturalRef.current = {
                        w: el.naturalWidth,
                        h: el.naturalHeight,
                      };
                    }}
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
                      // Matches the canvas maths above — contain, then zoom
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
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

              <div className="flex items-center gap-3">
                <ZoomIn size={15} className="text-gray-500 shrink-0" />
                <input
                  type="range"
                  min={MIN_ZOOM}
                  max={5}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(+e.target.value)}
                  className="flex-1 accent-[#0083fe] cursor-pointer"
                />
                <span className="text-[10px] font-black text-gray-500 tabular-nums w-10 text-right">
                  {zoom.toFixed(1)}×
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={confirm}
                  disabled={busy}
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
                  onClick={() => {
                    setZoom(1);
                    setOffset({ x: 0, y: 0 });
                  }}
                  disabled={busy}
                  title="Fit the whole image"
                  className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white font-black text-[11px] uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Fit
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
