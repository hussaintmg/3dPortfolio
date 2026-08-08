"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Gauge,
} from "lucide-react";

export interface MediaItem {
  url: string;
  name?: string;
  mime?: string;
  size?: number;
  kind: "image" | "video" | "pdf";
}

interface Props {
  item: MediaItem | null;
  onClose: () => void;
  /** Optional gallery, so arrow keys can move between attachments. */
  items?: MediaItem[];
  onNavigate?: (item: MediaItem) => void;
}

const fmtTime = (s: number) => {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

/* ────────────────────────────── image ───────────────────────────────── */

function ImageStage({ item }: { item: MediaItem }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // A new picture should always start from a clean view
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setLoaded(false);
  }, [item.url]);

  const zoomBy = (delta: number) =>
    setZoom((z) => {
      const next = Math.min(6, Math.max(1, +(z + delta).toFixed(2)));
      // Snapping back to 1 should also recentre, or the image drifts off-screen
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });

  return (
    <div
      className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden"
      onWheel={(e) => {
        if (!e.ctrlKey && Math.abs(e.deltaY) < 4) return;
        zoomBy(e.deltaY > 0 ? -0.2 : 0.2);
      }}
      onDoubleClick={() => (zoom > 1 ? (setZoom(1), setOffset({ x: 0, y: 0 })) : setZoom(2))}
      onPointerDown={(e) => {
        if (zoom <= 1) return;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
      }}
      onPointerUp={() => (drag.current = null)}
      style={{ cursor: zoom > 1 ? "grab" : "zoom-in", touchAction: "none" }}
    >
      {!loaded && (
        <Loader2 size={26} className="animate-spin text-gray-500 absolute" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.url}
        alt={item.name || "attachment"}
        onLoad={() => setLoaded(true)}
        draggable={false}
        className="max-w-full max-h-full object-contain select-none"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
          transition: drag.current ? "none" : "transform 180ms ease-out",
          opacity: loaded ? 1 : 0,
        }}
      />

      <div
        data-viewer-controls
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/10 p-1.5"
      >
        <button
          onClick={() => zoomBy(-0.3)}
          disabled={zoom <= 1}
          className="p-2.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer"
          aria-label="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
        <span className="px-2 text-[11px] font-black text-gray-400 tabular-nums w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => zoomBy(0.3)}
          disabled={zoom >= 6}
          className="p-2.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer"
          aria-label="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
        <span className="w-px h-5 bg-white/10 mx-1" />
        <button
          onClick={() => setRotation((r) => (r + 90) % 360)}
          className="p-2.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Rotate"
        >
          <RotateCw size={16} />
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setRotation(0);
            setOffset({ x: 0, y: 0 });
          }}
          className="p-2.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Reset view"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────── video ───────────────────────────────── */

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

function VideoStage({ item }: { item: MediaItem }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [buffered, setBuffered] = useState(0);
  const [waiting, setWaiting] = useState(true);

  const toggle = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const seek = (fraction: number) => {
    const v = ref.current;
    if (!v || !duration) return;
    v.currentTime = Math.min(duration, Math.max(0, fraction * duration));
  };

  // Space, arrows and M are what people expect from any player
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const v = ref.current;
      if (!v) return;
      if (e.key === " ") {
        e.preventDefault();
        toggle();
      } else if (e.key === "ArrowRight") {
        v.currentTime = Math.min(v.duration || 0, v.currentTime + 5);
      } else if (e.key === "ArrowLeft") {
        v.currentTime = Math.max(0, v.currentTime - 5);
      } else if (e.key.toLowerCase() === "m") {
        setMuted((m) => !m);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  useEffect(() => {
    const v = ref.current;
    if (v) {
      v.volume = volume;
      v.muted = muted;
      v.playbackRate = speed;
    }
  }, [volume, muted, speed]);

  const progress = duration ? time / duration : 0;

  return (
    <div className="relative flex-1 min-h-0 flex flex-col items-center justify-center">
      <div className="relative w-full flex-1 min-h-0 flex items-center justify-center">
        <video
          ref={ref}
          src={item.url}
          playsInline
          onClick={toggle}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onWaiting={() => setWaiting(true)}
          onPlaying={() => setWaiting(false)}
          onCanPlay={() => setWaiting(false)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            setTime(v.currentTime);
            if (v.buffered.length) {
              setBuffered(v.buffered.end(v.buffered.length - 1));
            }
          }}
          className="max-w-full max-h-full cursor-pointer"
        />
        {waiting && (
          <Loader2
            size={30}
            className="animate-spin text-white/80 absolute pointer-events-none"
          />
        )}
        {!playing && !waiting && (
          <button
            onClick={toggle}
            className="absolute inset-0 flex items-center justify-center group cursor-pointer"
            aria-label="Play"
          >
            <span className="size-16 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              <Play size={26} className="ml-1" />
            </span>
          </button>
        )}
      </div>

      <div
        data-viewer-controls
        className="w-full max-w-3xl px-3 pb-3 pt-2 space-y-2"
      >
        {/* Scrub bar with a buffered underlay */}
        <div
          className="relative h-1.5 rounded-full bg-white/10 cursor-pointer group"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            seek((e.clientX - r.left) / r.width);
          }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/20"
            style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-accent"
            style={{ width: `${progress * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 size-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress * 100}% - 6px)` }}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause size={17} /> : <Play size={17} />}
          </button>

          <span className="text-[11px] font-bold text-gray-400 tabular-nums">
            {fmtTime(time)} / {fmtTime(duration)}
          </span>

          <div className="flex items-center gap-1.5 ml-2">
            <button
              onClick={() => setMuted((m) => !m)}
              className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                setVolume(+e.target.value);
                setMuted(+e.target.value === 0);
              }}
              className="w-20 accent-[#0083fe] cursor-pointer"
              aria-label="Volume"
            />
          </div>

          <button
            onClick={() =>
              setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])
            }
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white text-[11px] font-black transition-colors cursor-pointer tabular-nums"
          >
            <Gauge size={13} /> {speed}×
          </button>

          <button
            onClick={() => ref.current?.requestFullscreen?.()}
            className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fullscreen"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────── pdf ────────────────────────────────── */

/**
 * PDFs are handed to the browser's own viewer in an iframe. Shipping a
 * renderer would mean bundling pdf.js and its worker for a feature that
 * every current browser already does well — what's added here is the frame,
 * the zoom control and a download that keeps the original filename.
 */
function PdfStage({ item }: { item: MediaItem }) {
  const [scale, setScale] = useState(100);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={26} className="animate-spin text-gray-500" />
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto bg-[#1b1b22] rounded-xl">
        <iframe
          // #view=FitH keeps the page width matched to the frame on first paint
          src={`${item.url}#view=FitH&zoom=${scale}`}
          title={item.name || "PDF"}
          onLoad={() => setLoaded(true)}
          className="w-full h-full min-h-[60vh] border-0 bg-white"
        />
      </div>

      <div
        data-viewer-controls
        className="flex items-center justify-center gap-1 pt-3"
      >
        <button
          onClick={() => setScale((s) => Math.max(50, s - 25))}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
          aria-label="Zoom out"
        >
          <ZoomOut size={15} />
        </button>
        <span className="px-3 text-[11px] font-black text-gray-400 tabular-nums w-14 text-center">
          {scale}%
        </span>
        <button
          onClick={() => setScale((s) => Math.min(300, s + 25))}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
          aria-label="Zoom in"
        >
          <ZoomIn size={15} />
        </button>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
        >
          <FileText size={13} /> Open in tab
        </a>
      </div>
    </div>
  );
}

/* ────────────────────────────── shell ───────────────────────────────── */

/**
 * Full-screen viewer for chat attachments.
 *
 * One shell, three stages, so the header, keyboard handling, download and
 * gallery navigation are written once regardless of what is being viewed.
 */
export default function MediaViewer({ item, onClose, items, onNavigate }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const gallery = items?.filter((i) => i.kind === item?.kind) || [];
  const index = item ? gallery.findIndex((g) => g.url === item.url) : -1;
  const canNavigate = gallery.length > 1 && index >= 0 && !!onNavigate;

  const go = useCallback(
    (dir: -1 | 1) => {
      if (!canNavigate) return;
      const next = (index + dir + gallery.length) % gallery.length;
      onNavigate?.(gallery[next]);
    },
    [canNavigate, index, gallery, onNavigate],
  );

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Video owns the arrow keys for seeking
      if (item.kind !== "video") {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [item, onClose, go]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[240] bg-black/92 backdrop-blur-md flex flex-col"
          onClick={(e) => {
            // Clicking the backdrop closes; clicking the media or its
            // controls must not.
            const t = e.target as HTMLElement;
            if (t === e.currentTarget || t.dataset.viewerBackdrop === "true") {
              onClose();
            }
          }}
        >
          <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/10">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-white truncate">
                {item.name || "Attachment"}
              </p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {item.kind}
                {canNavigate && ` · ${index + 1} of ${gallery.length}`}
                {item.size ? ` · ${(item.size / 1024).toFixed(0)} KB` : ""}
              </p>
            </div>

            <a
              href={item.url}
              download={item.name || ""}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white transition-colors"
              aria-label="Download"
            >
              <Download size={16} />
            </a>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-red-500/20 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </header>

          <div
            data-viewer-backdrop="true"
            className="flex-1 min-h-0 flex flex-col p-3 sm:p-6"
          >
            {item.kind === "image" && <ImageStage key={item.url} item={item} />}
            {item.kind === "video" && <VideoStage key={item.url} item={item} />}
            {item.kind === "pdf" && <PdfStage key={item.url} item={item} />}
          </div>

          {canNavigate && (
            <>
              <button
                onClick={() => go(-1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 border border-white/10 text-white hover:bg-black/80 transition-colors cursor-pointer"
                aria-label="Previous"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => go(1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 border border-white/10 text-white hover:bg-black/80 transition-colors cursor-pointer"
                aria-label="Next"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
