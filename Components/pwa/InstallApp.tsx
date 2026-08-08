"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Share, Plus, X, Check, Smartphone } from "lucide-react";
import { useInstallApp } from "@/hooks/useInstallApp";
import { useSite } from "@/context/SiteContext";

const DISMISS_KEY = "install-banner-dismissed";

/** Shared iOS instructions — Safari gives us no programmatic install. */
function IosSteps({ name }: { name: string }) {
  return (
    <ol className="space-y-2.5 text-left">
      {[
        { icon: Share, text: "Tap the Share button in Safari's toolbar" },
        { icon: Plus, text: 'Scroll down and choose "Add to Home Screen"' },
        { icon: Check, text: `Tap "Add" — ${name} appears on your home screen` },
      ].map((s, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-0.5 size-6 shrink-0 rounded-lg bg-accent/15 border border-accent/25 text-accent flex items-center justify-center">
            <s.icon size={12} />
          </span>
          <span className="text-[12px] text-gray-300 font-medium leading-relaxed">
            {s.text}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Footer entry: "Install app".
 *
 * Hidden once the app is installed, and on browsers that can't install at
 * all — an install link that does nothing is worse than no link.
 */
export function InstallLink({ className = "" }: { className?: string }) {
  const { canInstall, canPrompt, platform, install, ready } = useInstallApp();
  const { settings } = useSite();
  const [showIos, setShowIos] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!ready || !canInstall) return null;

  const onClick = async () => {
    if (canPrompt) {
      await install();
      return;
    }
    if (platform === "ios") setShowIos(true);
  };

  return (
    <>
      <button
        onClick={onClick}
        className={
          className ||
          "inline-flex items-center gap-2 text-sm text-gray-400 hover:text-accent transition-colors font-medium cursor-pointer"
        }
      >
        <Download size={14} />
        Install app
      </button>

      {mounted &&
        showIos &&
        createPortal(
          <div
            className="fixed inset-0 z-[210] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowIos(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0d0d14] p-6 space-y-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-white">
                    Add to Home Screen
                  </h3>
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                    iPhone &amp; iPad
                  </p>
                </div>
                <button
                  onClick={() => setShowIos(false)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <IosSteps name={settings.websiteName} />
            </motion.div>
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * A one-time bottom sheet on phones. It waits a few seconds so it never
 * lands on top of the first paint, and once dismissed it stays dismissed.
 */
export function InstallBanner() {
  const { canInstall, canPrompt, platform, install, ready } = useInstallApp();
  const { settings } = useSite();
  const [open, setOpen] = useState(false);
  const [showIos, setShowIos] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!ready || !canInstall) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (window.innerWidth > 820) return; // phones and small tablets only

    const t = setTimeout(() => setOpen(true), 6000);
    return () => clearTimeout(t);
  }, [ready, canInstall]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
    setShowIos(false);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 140, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 140, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="fixed bottom-0 inset-x-0 z-[190] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div className="rounded-3xl border border-white/12 bg-[#0d0d14]/97 backdrop-blur-2xl p-4 shadow-[0_-10px_50px_rgba(0,0,0,0.6)] space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-11 shrink-0 rounded-2xl bg-accent/15 border border-accent/25 text-accent flex items-center justify-center">
                <Smartphone size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-white truncate">
                  Install {settings.websiteName}
                </p>
                <p className="text-[11px] text-gray-400 font-medium">
                  Full screen, offline pages and app notifications
                </p>
              </div>
              <button
                onClick={dismiss}
                aria-label="Dismiss"
                className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {showIos && <IosSteps name={settings.websiteName} />}

            {!showIos && (
              <button
                onClick={async () => {
                  if (canPrompt) {
                    const outcome = await install();
                    if (outcome === "accepted") dismiss();
                    return;
                  }
                  if (platform === "ios") setShowIos(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent hover:bg-accent-hover text-white font-black text-[11px] uppercase tracking-widest transition-colors active:scale-[0.98] cursor-pointer"
              >
                <Download size={14} />
                {platform === "ios" ? "Show me how" : "Install"}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
