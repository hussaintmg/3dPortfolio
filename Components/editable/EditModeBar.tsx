"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PencilLine, Save, X, Loader2, MousePointerClick } from "lucide-react";
import { useSite } from "@/context/SiteContext";
import StylePanel from "./StylePanel";

/**
 * Floating editor control shown at the bottom of EVERY page — public, auth
 * and portal — but only for the owner while maintenance mode is on.
 */
export default function EditModeBar() {
  const {
    canEdit,
    isEditing,
    setIsEditing,
    dirtyCount,
    saveEdits,
    discardEdits,
    saving,
  } = useSite();
  const pathname = usePathname() || "";
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Navigating away drops any half-finished edits rather than silently
  // carrying them to another page.
  useEffect(() => {
    if (isEditing) discardEdits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // The dashboard has its own CMS screens — no on-page editor there.
  const isDashboard = pathname.startsWith("/dashboard");

  if (!mounted || !canEdit || isDashboard) return null;

  return (
    <>
      <StylePanel />

      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            data-edit-bar
            className="fixed top-0 inset-x-0 z-[95] flex justify-center pointer-events-none"
          >
            <div className="mt-3 flex items-center gap-2 px-4 py-2 rounded-full bg-accent/15 border border-accent/30 backdrop-blur-xl text-accent text-[11px] font-bold uppercase tracking-widest shadow-2xl">
              <MousePointerClick size={13} />
              Click any highlighted element to edit its text or style
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        data-edit-bar
        className="fixed bottom-6 inset-x-0 z-[96] flex justify-center pointer-events-none"
      >
        <AnimatePresence initial={false}>
          {!isEditing ? (
            <motion.button
              key="edit-btn"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              onClick={() => setIsEditing(true)}
              className="pointer-events-auto group flex items-center gap-3 pl-5 pr-6 py-3.5 rounded-2xl bg-white text-black font-black text-[11px] uppercase tracking-widest shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/20 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <span className="p-1.5 rounded-lg bg-black text-white group-hover:rotate-12 transition-transform">
                <PencilLine size={14} />
              </span>
              Edit Page
            </motion.button>
          ) : (
            <motion.div
              key="edit-bar"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="pointer-events-auto flex items-center gap-2 p-2 rounded-2xl bg-[#0d0d14]/92 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            >
              <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                {dirtyCount > 0 ? (
                  <span className="text-accent">
                    {dirtyCount} change{dirtyCount > 1 ? "s" : ""}
                  </span>
                ) : (
                  "No changes yet"
                )}
              </div>

              <button
                onClick={() => saveEdits()}
                disabled={saving || dirtyCount === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Save
              </button>

              <button
                onClick={discardEdits}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/15 text-gray-400 hover:text-red-400 font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 border border-white/10 cursor-pointer"
              >
                <X size={14} />
                Discard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
