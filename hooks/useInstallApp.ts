"use client";

import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallPlatform = "chromium" | "ios" | "firefox" | "unsupported";

/**
 * Everything the UI needs to offer "install this as an app".
 *
 * Chromium fires `beforeinstallprompt` and lets us open the real install
 * dialog. iOS Safari never fires it and has no API at all, so there the only
 * honest option is to show the Share → Add to Home Screen steps.
 */
export function useInstallApp() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("unsupported");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
      // iPadOS 13+ reports itself as a Mac
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isIOS) setPlatform("ios");
    else if (/Firefox/.test(ua)) setPlatform("firefox");
    else setPlatform("chromium");

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // Safari's own flag for a home-screen launch
      (window.navigator as any).standalone === true;
    setInstalled(standalone);
    setReady(true);

    const onPrompt = (e: Event) => {
      // Keep the event so the button can open the dialog later on
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return "unavailable" as const;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // The event is single-use — Chrome will fire a fresh one if declined
    setDeferred(null);
    return outcome;
  }, [deferred]);

  return {
    /** True once we know enough to render without flicker. */
    ready,
    installed,
    platform,
    /** Chromium has handed us a usable install prompt. */
    canPrompt: !!deferred,
    /** Worth showing an install affordance at all. */
    canInstall: !installed && (!!deferred || platform === "ios"),
    install,
  };
}
