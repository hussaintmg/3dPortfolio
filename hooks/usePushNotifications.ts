"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";

const PREF_KEY = "notifications-enabled";

export type PermissionState = "default" | "granted" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Notifications delivered through the service worker.
 *
 * Going via the SW (rather than `new Notification()`) is what lets us attach
 * our own icon, badge and action buttons — and once the site is installed as
 * an app, the OS drops the browser's name and shows ours instead.
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [enabled, setEnabled] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [devices, setDevices] = useState(0);
  const [publicKey, setPublicKey] = useState("");
  const [installed, setInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "Notification" in window &&
    "PushManager" in window;

  // ── register the worker and read current state ───────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("Notification" in window)) {
      setPermission("unsupported");
      setReady(true);
      return;
    }

    setPermission(Notification.permission as PermissionState);
    setEnabled(localStorage.getItem(PREF_KEY) === "true");
    setInstalled(
      window.matchMedia?.("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true,
    );

    (async () => {
      try {
        const { data } = await axios.get("/api/push");
        if (data.success) {
          setPublicKey(data.publicKey || "");
          setDevices(data.devices || 0);
        }
      } catch {
        // not signed in — the panel will still render
      }

      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
          });
          const existing = await reg.pushManager.getSubscription();
          setSubscribed(!!existing);
        } catch {
          // registration can fail on http origins other than localhost
        }
      }
      setReady(true);
    })();
  }, []);

  // Chrome fires this when the app is installable
  useEffect(() => {
    const onPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  /** Ask for permission, subscribe this device, and store it server-side. */
  const enable = useCallback(async () => {
    if (!supported) return { ok: false, reason: "unsupported" as const };
    try {
      setBusy(true);

      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result !== "granted") return { ok: false, reason: result };

      localStorage.setItem(PREF_KEY, "true");
      setEnabled(true);

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub && publicKey) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      if (sub) {
        const { data } = await axios.post("/api/push", {
          subscription: sub.toJSON(),
          userAgent: navigator.userAgent,
        });
        if (data.success) {
          setSubscribed(true);
          setDevices((d) => d + 1);
        }
      }

      return { ok: true as const };
    } catch (e: any) {
      return { ok: false, reason: e?.message || "failed" };
    } finally {
      setBusy(false);
    }
  }, [supported, publicKey]);

  const disable = useCallback(async () => {
    try {
      setBusy(true);
      localStorage.setItem(PREF_KEY, "false");
      setEnabled(false);

      const reg = await navigator.serviceWorker?.ready;
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await axios
          .delete(`/api/push?endpoint=${encodeURIComponent(sub.endpoint)}`)
          .catch(() => {});
        await sub.unsubscribe().catch(() => {});
        setSubscribed(false);
        setDevices((d) => Math.max(0, d - 1));
      }
    } finally {
      setBusy(false);
    }
  }, []);

  /** Server-sent test — proves the whole push path, not just a local popup. */
  const sendTest = useCallback(async () => {
    const { data } = await axios.put("/api/push");
    return data;
  }, []);

  /**
   * Raises a notification from the page through the service worker, so it
   * carries our icon and actions. Suppressed while the tab is focused.
   */
  const notifyLocal = useCallback(
    async (
      title: string,
      opts?: { body?: string; url?: string; tag?: string; force?: boolean },
    ) => {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission !== "granted") return;
      if (localStorage.getItem(PREF_KEY) !== "true") return;
      if (!opts?.force && document.visibilityState === "visible") return;

      try {
        const reg = await navigator.serviceWorker.ready;
        reg.active?.postMessage({
          type: "SHOW_NOTIFICATION",
          title,
          body: opts?.body,
          url: opts?.url,
          tag: opts?.tag,
        });
      } catch {
        // ignore — the in-app toast already covered it
      }
    },
    [],
  );

  const install = useCallback(async () => {
    if (!installPrompt) return false;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    return choice?.outcome === "accepted";
  }, [installPrompt]);

  return {
    ready,
    supported,
    permission,
    enabled,
    subscribed,
    devices,
    busy,
    installed,
    canInstall: !!installPrompt,
    enable,
    disable,
    sendTest,
    notifyLocal,
    install,
  };
}
