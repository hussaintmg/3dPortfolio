"use client";

import { useEffect } from "react";

/**
 * Registers the service worker for every visitor, not just those who turned
 * push notifications on. A registered worker with a fetch handler is what
 * makes the browser offer "Install app" in the first place.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (window.self !== window.top) return; // not inside the responsive preview

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // An unavailable worker only costs offline support — never break the page
      });
    };

    // Registering after load keeps it off the critical path
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
