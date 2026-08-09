"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Sparkles } from "lucide-react";
import { Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

interface Props {
  isVisible: boolean;
  /**
   * 0–100. When given, the bar becomes determinate and reflects real
   * readiness instead of sliding back and forth forever.
   */
  progress?: number;
  /** Replaces "Initializing Systems" — e.g. the site's own name. */
  title?: string;
  /** Replaces the line under the bar. */
  status?: string;
}

/**
 * The site's loading curtain.
 *
 * Kept deliberately as it was — the orbs, the rotating dashed ring and the
 * grid are the look the site is known by; only the progress bar learned to
 * tell the truth about what is actually still loading.
 */
export default function LoadingScreen({
  isVisible,
  progress,
  title = "Initializing Systems",
  status = "Loading Architectural Data...",
}: Props) {
  const determinate = typeof progress === "number";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          /**
           * Required, not decorative. Without a key AnimatePresence cannot
           * track the child across the true→false flip, so the exit never
           * resolves and the curtain stays on screen at full opacity for
           * ever — the page loads fine underneath and nobody ever sees it.
           */
          key="loading-screen"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.8, ease: "easeInOut" },
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black overflow-hidden"
          aria-live="polite"
          aria-busy="true"
        >
          {/* Animated Background Orbs */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 left-1/4 size-[400px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-1/4 right-1/4 size-[500px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none"
          />

          {/* Center Content */}
          <div className="relative z-10 flex flex-col items-center space-y-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className="size-24 rounded-3xl bg-linear-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.3)]">
                <Terminal className="text-white animate-pulse" size={40} />
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-4 border border-indigo-500/30 rounded-full border-dashed"
              />
            </motion.div>

            <div className="flex flex-col items-center space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-3"
              >
                <Sparkles size={16} className="text-indigo-400 animate-pulse" />
                <span
                  className={`text-xs font-bold text-indigo-400 uppercase tracking-[0.4em] ${spaceGrotesk.className}`}
                >
                  {title}
                </span>
                <Sparkles size={16} className="text-indigo-400 animate-pulse" />
              </motion.div>

              <div className="h-1 w-48 bg-white/5 rounded-full overflow-hidden relative">
                {determinate ? (
                  <motion.div
                    className="h-full rounded-full bg-linear-to-r from-indigo-500 via-purple-400 to-indigo-400"
                    animate={{ width: `${Math.min(100, Math.max(0, progress!))}%` }}
                    transition={{ ease: "easeOut", duration: 0.35 }}
                  />
                ) : (
                  <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 bg-linear-to-r from-transparent via-indigo-500 to-transparent"
                  />
                )}
              </div>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-slate-500 text-[10px] font-medium tracking-[0.2em] uppercase animate-pulse"
            >
              {status}
            </motion.p>
          </div>

          {/* Decorative Grid */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
