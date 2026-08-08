"use client";

import { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Scene3DHandle } from "@/Components/3D/Scene3D";

/**
 * three.js lives behind this boundary only. Keeping the import here (rather
 * than at the top of the file) means this component itself stays in the main
 * bundle, so the placeholder orb below paints on the very first frame while
 * the ~1MB WebGL chunk is still downloading.
 */
const Scene3D = dynamic(() => import("@/Components/3D/Scene3D"), {
  ssr: false,
});

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/** Pure-CSS stand-in shown until the real sphere is rendering. */
function OrbPlaceholder({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none flex items-center justify-center lg:justify-end lg:pr-[12%]"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 700ms ease-out",
      }}
    >
      <div className="relative size-[300px] lg:size-[420px]">
        <div className="absolute inset-0 rounded-full blur-[2px] animate-orb-float bg-[radial-gradient(circle_at_32%_28%,rgba(190,205,255,0.55),rgba(79,102,220,0.42)_38%,rgba(24,32,72,0.55)_66%,rgba(8,10,25,0.65)_100%)]" />
        <div className="absolute inset-0 rounded-full blur-[70px] opacity-70 bg-[radial-gradient(circle,rgba(99,102,241,0.5),transparent_70%)]" />
        <div className="absolute -inset-10 rounded-full blur-[110px] opacity-50 bg-[radial-gradient(circle,rgba(56,90,220,0.35),transparent_72%)]" />
      </div>
    </div>
  );
}

/**
 * Fixed 3D layer for the home page.
 *
 * Mounted from the root layout so it survives the page's loading skeleton.
 * A CSS orb stands in immediately; the WebGL sphere crossfades over it once
 * its chunk and HDR environment are ready.
 */
export default function Scene3DBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scene3DRef = useRef<Scene3DHandle>(null);
  const [contentReady, setContentReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  // Swap the orb for the canvas once the renderer has actually produced frames
  useEffect(() => {
    if (sceneReady) return;
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const check = () => {
      const canvas = el.querySelector("canvas");
      if (canvas && canvas.width > 0) {
        setSceneReady(true);
        return;
      }
      raf = requestAnimationFrame(check);
    };
    raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, [sceneReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const triggers: ScrollTrigger[] = [];

    const wireTriggers = () => {
      // ── Section-change burst ────────────────────────────────────────────
      ["#about", "#methodology", "#skills", "#projects", "#contact"].forEach(
        (sel) => {
          const el = document.querySelector(sel);
          if (!el) return;
          triggers.push(
            ScrollTrigger.create({
              trigger: el,
              start: "top 75%",
              onEnter: () => scene3DRef.current?.triggerBurst(),
              onEnterBack: () => scene3DRef.current?.triggerBurst(),
            }),
          );
        },
      );

      // ── Solutions stack: park the sphere on the left ────────────────────
      const stackEl = document.querySelector("#projects-stack");
      if (stackEl) {
        triggers.push(
          ScrollTrigger.create({
            trigger: stackEl,
            start: "top 60%",
            end: "top 60%",
            onEnter: () => scene3DRef.current?.moveToLeft(),
            onLeaveBack: () => scene3DRef.current?.moveToRight(),
          }),
        );
      }

      // ── Projects section: slide the whole 3D layer up and away ──────────
      const projectsEl = document.querySelector("#projects");
      if (projectsEl) {
        triggers.push(
          ScrollTrigger.create({
            trigger: projectsEl,
            start: "top bottom",
            end: "top top",
            scrub: true,
            invalidateOnRefresh: true,
            animation: gsap.fromTo(
              container,
              { y: 0 },
              { y: () => -window.innerHeight, ease: "none" },
            ),
          }),
        );
      }

      ScrollTrigger.refresh();
    };

    /**
     * The skeleton renders before the page does, so wait for a section that
     * only the real page produces before wiring anything up.
     */
    const contentPresent = () =>
      !!document.querySelector("#projects") &&
      !!document.querySelector("#projects-stack");

    let observer: MutationObserver | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const activate = () => {
      if (cancelled) return;
      setContentReady(true);
      wireTriggers();
    };

    if (contentPresent()) {
      activate();
    } else {
      observer = new MutationObserver(() => {
        if (contentPresent()) {
          observer?.disconnect();
          observer = null;
          activate();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      // Never leave the layer dimmed forever if the markup ever changes
      timeoutId = setTimeout(() => {
        observer?.disconnect();
        observer = null;
        if (!cancelled) setContentReady(true);
      }, 12000);
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
      triggers.forEach((t) => t.kill());
    };
  }, []);

  return (
    <div
      id="scene3d-container"
      ref={containerRef}
      style={{
        position: "fixed",
        top: 50,
        left: 0,
        height: "100vh",
        width: "100vw",
        zIndex: -1,
        pointerEvents: "none",
        // Subdued while the skeleton is up, full once the page is really here
        opacity: contentReady ? 1 : 0.45,
        transition: "opacity 900ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <OrbPlaceholder visible={!sceneReady} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: sceneReady ? 1 : 0,
          transition: "opacity 800ms ease-out",
        }}
      >
        <Scene3D ref={scene3DRef} />
      </div>
    </div>
  );
}
