"use client";

import { useCallback, useEffect, useRef } from "react";
import { AnimationConfig, easingCss } from "@/lib/animations";

/**
 * Plays an element's configured entrance animation when it scrolls into view.
 *
 * Returns a ref callback plus the props to spread onto the element. When no
 * animation is configured it returns nothing, so unanimated elements stay
 * completely untouched (and never start hidden).
 */
export function useReveal(config?: AnimationConfig | null) {
  const elRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const active = !!config && config.type && config.type !== "none";

  const setRef = useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      elRef.current = node;

      if (!node || !active) return;

      // Respect the OS setting rather than forcing motion on anyone
      if (
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ) {
        node.classList.add("anim-play");
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              node.classList.add("anim-play");
              if (config!.once) observer.unobserve(node);
            } else if (!config!.once) {
              node.classList.remove("anim-play");
            }
          }
        },
        { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
      );

      observer.observe(node);
      observerRef.current = observer;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active, config?.type, config?.once, config?.duration, config?.delay, config?.easing],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  if (!active) return { setRef: undefined, animProps: {} as Record<string, any> };

  return {
    setRef,
    animProps: {
      "data-anim": config!.type,
      style: {
        ["--anim-name" as any]: `anim-${config!.type}`,
        ["--anim-dur" as any]: `${config!.duration}ms`,
        ["--anim-delay" as any]: `${config!.delay}ms`,
        ["--anim-ease" as any]: easingCss(config!.easing),
      } as React.CSSProperties,
    },
  };
}
