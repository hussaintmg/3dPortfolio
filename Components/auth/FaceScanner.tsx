"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ScanFace, X, Check, Loader2, AlertTriangle } from "lucide-react";
import {
  startCamera,
  stopCamera,
  readFace,
  loadModels,
  BlinkDetector,
  type FaceReading,
} from "@/lib/faceClient";

export interface ScanStep {
  id: string;
  prompt: string;
  /** Capture only once the person blinks — proves it isn't a photograph. */
  requireBlink?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  steps: ScanStep[];
  /** Called with one descriptor per step, in order. */
  onComplete: (descriptors: number[][]) => Promise<void> | void;
  busyLabel?: string;
}

type Phase = "idle" | "loading" | "scanning" | "submitting" | "error";

/** How good a frame has to be before it counts. */
const MIN_SCORE = 0.7;
const MIN_COVERAGE = 0.045;

/**
 * The camera modal shared by face enrolment and face sign-in.
 *
 * It walks through a list of prompts, grabbing one descriptor per prompt
 * and only accepting frames that are sharp, big enough and — where asked —
 * accompanied by a real blink. Frames never leave the browser; only the
 * 128-number descriptor does.
 */
export default function FaceScanner({
  open,
  onClose,
  title,
  steps,
  onComplete,
  busyLabel = "Saving…",
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const blinkRef = useRef(new BlinkDetector());
  const capturedRef = useRef<number[][]>([]);
  const runningRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [reading, setReading] = useState<FaceReading | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => setMounted(true), []);

  const cleanup = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    stopCamera(streamRef.current);
    streamRef.current = null;
  }, []);

  const finish = useCallback(
    async (descriptors: number[][]) => {
      cleanup();
      setPhase("submitting");
      try {
        await onComplete(descriptors);
      } catch (err: any) {
        setError(err?.message || "Something went wrong");
        setPhase("error");
      }
    },
    [cleanup, onComplete],
  );

  /** One pass of detect → judge → maybe capture. */
  const tick = useCallback(async () => {
    if (!runningRef.current || !videoRef.current) return;

    let r: FaceReading | null = null;
    try {
      r = await readFace(videoRef.current);
    } catch {
      // a dropped frame is not worth surfacing
    }
    setReading(r);

    if (!runningRef.current) return;

    if (!r) {
      setHint("No face detected — look at the camera");
    } else if (r.coverage < MIN_COVERAGE) {
      setHint("Move a little closer");
    } else if (r.score < MIN_SCORE) {
      setHint("Hold still, and find some more light");
    } else {
      const step = steps[capturedRef.current.length];
      if (step?.requireBlink) {
        blinkRef.current.push(r.ear);
        if (!blinkRef.current.blinked) {
          setHint("Now blink once");
        }
      }

      const readyToCapture =
        !step?.requireBlink || blinkRef.current.blinked;

      if (readyToCapture) {
        capturedRef.current.push(r.descriptor);
        blinkRef.current.reset();
        setFlash(true);
        setTimeout(() => setFlash(false), 220);

        if (capturedRef.current.length >= steps.length) {
          await finish(capturedRef.current.slice());
          return;
        }
        setStepIndex(capturedRef.current.length);
        setHint("");
        // A short pause so the next prompt isn't captured from the same pose
        await new Promise((res) => setTimeout(res, 900));
      }
    }

    if (runningRef.current) {
      rafRef.current = requestAnimationFrame(() => void tick());
    }
  }, [steps, finish]);

  // Start / stop with the modal
  useEffect(() => {
    if (!open) {
      cleanup();
      return;
    }

    let cancelled = false;
    capturedRef.current = [];
    blinkRef.current.reset();
    setStepIndex(0);
    setError("");
    setHint("");
    setReading(null);
    setPhase("loading");

    (async () => {
      try {
        await loadModels((m) => !cancelled && setHint(m));
        if (cancelled) return;

        if (!videoRef.current) return;
        streamRef.current = await startCamera(videoRef.current);
        if (cancelled) {
          stopCamera(streamRef.current);
          return;
        }

        setPhase("scanning");
        setHint("");
        runningRef.current = true;
        void tick();
      } catch (err: any) {
        if (cancelled) return;
        setError(
          err?.name === "NotAllowedError"
            ? "Camera access was blocked. Allow the camera for this site and try again."
            : err?.name === "NotFoundError"
              ? "No camera was found on this device."
              : err?.message || "Could not start the camera",
        );
        setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => cleanup, [cleanup]);

  if (!mounted || !open) return null;

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const progress = capturedRef.current.length;
  const good =
    !!reading && reading.score >= MIN_SCORE && reading.coverage >= MIN_COVERAGE;

  return createPortal(
    <div className="fixed inset-0 z-[230] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0d0d14] p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <ScanFace size={17} className="text-accent" /> {title}
            </h3>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
              {steps.length > 1
                ? `Step ${Math.min(progress + 1, steps.length)} of ${steps.length}`
                : "Look at the camera"}
            </p>
          </div>
          <button
            onClick={() => {
              cleanup();
              onClose();
            }}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative mx-auto size-56 rounded-full overflow-hidden border-2 bg-black/60 transition-colors duration-200"
          style={{ borderColor: good ? "#22c55e" : "rgba(255,255,255,0.15)" }}
        >
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-full object-cover -scale-x-100"
          />
          {flash && <div className="absolute inset-0 bg-white/70" />}
          {(phase === "loading" || phase === "submitting") && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <Loader2 size={26} className="animate-spin text-accent" />
            </div>
          )}
        </div>

        {/* Per-step dots */}
        {steps.length > 1 && (
          <div className="flex justify-center gap-2">
            {steps.map((s, i) => (
              <span
                key={s.id}
                className={`h-1.5 rounded-full transition-all ${
                  i < progress
                    ? "w-6 bg-green-500"
                    : i === progress
                      ? "w-6 bg-accent"
                      : "w-1.5 bg-white/15"
                }`}
              />
            ))}
          </div>
        )}

        <div className="min-h-[52px] text-center space-y-1.5">
          {phase === "error" ? (
            <p className="text-[12px] font-bold text-red-400 flex items-center justify-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              {error}
            </p>
          ) : phase === "submitting" ? (
            <p className="text-sm font-black text-white">{busyLabel}</p>
          ) : (
            <>
              <p className="text-sm font-black text-white">
                {phase === "loading" ? "Getting ready…" : step?.prompt}
              </p>
              <p className="text-[11px] font-medium text-gray-500">
                {hint || (good ? "Hold it…" : "Centre your face in the circle")}
              </p>
            </>
          )}
        </div>

        <p className="text-[10px] leading-relaxed text-gray-600 text-center font-medium">
          Nothing is recorded. The camera image stays on this device — only a
          numeric face signature is sent, and it can't be turned back into a
          photo.
        </p>

        {phase === "error" && (
          <button
            onClick={() => {
              cleanup();
              onClose();
            }}
            className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-black text-[11px] uppercase tracking-widest hover:bg-white/10 transition-colors cursor-pointer"
          >
            Close
          </button>
        )}

        {progress >= steps.length && phase !== "error" && (
          <p className="text-[11px] font-black text-green-400 text-center flex items-center justify-center gap-1.5">
            <Check size={13} /> All captures taken
          </p>
        )}
      </motion.div>
    </div>,
    document.body,
  );
}
