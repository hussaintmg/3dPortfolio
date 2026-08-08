"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSite } from "@/context/SiteContext";
import { useBootStatus, resetBootStatus } from "@/hooks/useBootStatus";

/** Nothing should ever hold the site hostage — bail out after this. */
const MAX_WAIT = 9000;
/** A beat of stillness once everything is in, so the exit doesn't snap. */
const SETTLE = 420;

/**
 * The home page's loading curtain.
 *
 * It sits ABOVE the 3D layer, which keeps rendering behind it, so the sphere
 * is already alive and settled by the time the curtain lifts — the previous
 * approach showed a flat CSS stand-in first and then swapped, which read as a
 * second, wrong-looking shape. The curtain stays until both the scene and the
 * page's own data are in, then eases away.
 */
export default function HomeLoader() {
  const { sceneReady, dataReady } = useBootStatus();
  const { settings } = useSite();
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(8);
  const timedOut = useRef(false);

  // Reset when the home page unmounts, so a return visit loads properly
  useEffect(() => resetBootStatus, []);

  // Creep forward on a curve so it never looks stuck, but never claim 100%
  // until the real work is actually finished.
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      setProgress((p) => {
        const target = sceneReady && dataReady ? 100 : sceneReady || dataReady ? 82 : 62;
        if (p >= target) return p;
        return p + Math.max(0.6, (target - p) * 0.08);
      });
    }, 60);
    return () => clearInterval(id);
  }, [visible, sceneReady, dataReady]);

  useEffect(() => {
    if (!visible) return;
    if (!sceneReady || !dataReady) return;
    setProgress(100);
    const id = setTimeout(() => setVisible(false), SETTLE);
    return () => clearTimeout(id);
  }, [sceneReady, dataReady, visible]);

  /**
   * Hard deadline, measured from mount.
   *
   * Deliberately its own effect with no dependencies: hanging it off the
   * readiness flags would restart the clock every time one of them changed,
   * so a slow scene could push the deadline well past the intended wait.
   */
  useEffect(() => {
    const bail = setTimeout(() => {
      timedOut.current = true;
      setProgress(100);
      setTimeout(() => setVisible(false), SETTLE);
    }, MAX_WAIT);
    return () => clearTimeout(bail);
  }, []);

  // The page underneath must not scroll while the curtain is up
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  const name = settings.websiteName || "Portfolio";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="home-loader"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            filter: "blur(14px)",
            transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
          }}
          className="fixed inset-0 z-[9998] flex flex-col items-center justify-center pointer-events-auto"
          aria-live="polite"
          aria-busy="true"
        >
          {/* Translucent, so the sphere behind is already visible and settled
              by the time this lifts rather than appearing out of nowhere. */}
          <div className="absolute inset-0 bg-[#05060d]/94 backdrop-blur-2xl" />

          <div className="relative flex flex-col items-center gap-7 px-8">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-3"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.45em] text-accent">
                {name}
              </span>
              <span className="text-[11px] font-medium text-gray-500 tabular-nums">
                {timedOut.current
                  ? "Almost there"
                  : !sceneReady
                    ? "Preparing the scene"
                    : !dataReady
                      ? "Fetching your work"
                      : "Ready"}
              </span>
            </motion.div>

            {/* Determinate bar: it reflects real readiness, not a fake timer */}
            <div className="h-[3px] w-56 sm:w-72 rounded-full bg-white/8 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-linear-to-r from-indigo-500 via-accent to-indigo-400"
                animate={{ width: `${Math.min(100, progress)}%` }}
                transition={{ ease: "easeOut", duration: 0.35 }}
              />
            </div>

            <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.25em]">
              {[
                ["Scene", sceneReady],
                ["Content", dataReady],
              ].map(([label, done]) => (
                <span
                  key={label as string}
                  className={`flex items-center gap-1.5 transition-colors duration-300 ${
                    done ? "text-green-400" : "text-gray-700"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full transition-colors duration-300 ${
                      done ? "bg-green-400" : "bg-gray-700 animate-pulse"
                    }`}
                  />
                  {label as string}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
