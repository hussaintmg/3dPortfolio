"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Scene3D, { Scene3DHandle } from "@/Components/3D/Scene3D";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function Scene3DBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scene3DRef = useRef<Scene3DHandle>(null);
  const isAtProjectsStack = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Section-change burst ──────────────────────────────────────────────────
    const burstSections = [
      "#about",
      "#methodology",
      "#skills",
      "#projects",
      "#contact",
    ];
    const burstTriggers: ScrollTrigger[] = [];

    burstSections.forEach((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      burstTriggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: "top 75%",
          onEnter: () => scene3DRef.current?.triggerBurst(),
          onEnterBack: () => scene3DRef.current?.triggerBurst(),
        }),
      );
    });

    // ── ProjectsStack & Projects: Move sphere to left ────────────────────────
    const stackEl = document.querySelector("#projects-stack");
    let leftRightTrigger: ScrollTrigger | null = null;

    if (stackEl) {
      leftRightTrigger = ScrollTrigger.create({
        trigger: stackEl,
        start: "top 60%", // When we scroll down into projects-stack
        end: "top 60%",
        onEnter: () => scene3DRef.current?.moveToLeft(),
        onLeaveBack: () => scene3DRef.current?.moveToRight(),
      });
    }
    // Contact section scroll-out is now managed inside page.tsx
    // to strictly synchronize with the end of the horizontal cards!

    return () => {
      burstTriggers.forEach((t) => t.kill());
      leftRightTrigger?.kill();
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
      }}
    >
      <Scene3D ref={scene3DRef} />
    </div>
  );
}
