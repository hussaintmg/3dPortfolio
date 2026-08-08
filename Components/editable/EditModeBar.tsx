"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  PencilLine,
  Save,
  X,
  Loader2,
  MousePointerClick,
  Ruler,
} from "lucide-react";
import { useSite } from "@/context/SiteContext";
import StylePanel from "./StylePanel";
import ElementPicker from "./ElementPicker";
import ResponsivePreview from "./ResponsivePreview";

/**
 * Floating editor control shown at the bottom of EVERY page — public, auth,
 * portal and dashboard — but only for the owner while maintenance mode is on.
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
  const [responsive, setResponsive] = useState(false);
  /** The responsive tester renders the site in an iframe — no editor inside it. */
  const [embedded, setEmbedded] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setEmbedded(window.self !== window.top);
    } catch {
      setEmbedded(true); // cross-origin frame; treat as embedded
    }
  }, []);

  // Navigating away drops any half-finished edits rather than silently
  // carrying them to another page.
  useEffect(() => {
    if (isEditing) discardEdits();
    setResponsive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!mounted || !canEdit || embedded) return null;

  return (
    <>
      <StylePanel />
      {isEditing && <ElementPicker />}
      {responsive && <ResponsivePreview onClose={() => setResponsive(false)} />}

      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            data-edit-bar
            className="fixed top-0 inset-x-0 z-[95] flex justify-center pointer-events-none px-3"
          >
            <div className="mt-3 flex items-center gap-2 px-4 py-2 rounded-full bg-accent/15 border border-accent/30 backdrop-blur-xl text-accent text-[10px] sm:text-[11px] font-bold uppercase tracking-widest shadow-2xl text-center">
              <MousePointerClick size={13} className="shrink-0" />
              <span className="hidden sm:inline">
                Click any element to style it · Alt-click for its container
              </span>
              <span className="sm:hidden">Tap an element to style it</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        data-edit-bar
        className="fixed bottom-4 sm:bottom-6 inset-x-0 z-[96] flex justify-center pointer-events-none px-3"
      >
        <AnimatePresence initial={false}>
          {!isEditing ? (
            <motion.div
              key="edit-btn"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="pointer-events-auto flex items-center gap-2"
            >
              <button
                onClick={() => setIsEditing(true)}
                className="group flex items-center gap-2.5 pl-4 pr-5 py-3 rounded-2xl bg-white text-black font-black text-[10px] sm:text-[11px] uppercase tracking-widest shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/20 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              >
                <span className="p-1.5 rounded-lg bg-black text-white group-hover:rotate-12 transition-transform">
                  <PencilLine size={14} />
                </span>
                Edit Page
              </button>
              <button
                onClick={() => setResponsive(true)}
                title="Responsive tester"
                className="p-3.5 rounded-2xl bg-[#0d0d14]/92 backdrop-blur-2xl border border-white/10 text-gray-300 hover:text-accent hover:border-accent/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-colors cursor-pointer"
              >
                <Ruler size={15} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="edit-bar"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 p-2 rounded-2xl bg-[#0d0d14]/92 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            >
              <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                {dirtyCount > 0 ? (
                  <span className="text-accent">
                    {dirtyCount} change{dirtyCount > 1 ? "s" : ""}
                  </span>
                ) : (
                  "No changes"
                )}
              </div>

              <button
                onClick={() => setResponsive(true)}
                title="Responsive tester"
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-accent transition-colors cursor-pointer"
              >
                <Ruler size={14} />
              </button>

              <button
                onClick={() => saveEdits()}
                disabled={saving || dirtyCount === 0}
                className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-[10px] sm:text-[11px] uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
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
                className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/15 text-gray-400 hover:text-red-400 font-black text-[10px] sm:text-[11px] uppercase tracking-widest transition-all active:scale-95 border border-white/10 cursor-pointer"
              >
                <X size={14} />
                <span className="hidden sm:inline">Discard</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
