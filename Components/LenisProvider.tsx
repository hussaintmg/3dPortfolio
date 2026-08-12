"use client";

import { useEffect } from "react";
// @ts-ignore
import Lenis from "@studio-freight/lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Expose for debugging/E2E tests in dev only
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as any).ScrollTrigger = ScrollTrigger;
}

export default function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    lenis.on("scroll", ScrollTrigger.update);

    /**
     * Named so it can actually be removed again. The teardown used to hand
     * `gsap.ticker.remove` a freshly-created arrow function, which matches
     * nothing — so every mount left a callback behind driving a destroyed
     * Lenis on every single frame, forever.
     */
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    /**
     * In-page anchors, routed through Lenis.
     *
     * `scroll-behavior: smooth` used to do this, but it animated the scroll
     * position at the same time as Lenis did, and two animations on one value
     * is a stutter. Handing the jump to Lenis keeps a single source of truth —
     * which also keeps every pinned ScrollTrigger in step during the jump.
     */
    const onAnchorClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const link = (e.target as HTMLElement | null)?.closest?.("a");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#") || href === "#") return;
      const target = document.getElementById(href.slice(1));
      if (!target) return;
      e.preventDefault();
      // Clear of the fixed navbar
      lenis.scrollTo(target, { offset: -72 });
      history.replaceState(null, "", href);
    };
    document.addEventListener("click", onAnchorClick);

    return () => {
      document.removeEventListener("click", onAnchorClick);
      gsap.ticker.remove(raf);
      lenis.off("scroll", ScrollTrigger.update);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
