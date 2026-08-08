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

  const looping = !!config?.loop && config.loop !== "none";

  /**
   * The loop can only start once the entrance is finished — both would be
   * driving the same `animation` property otherwise, and the later
   * declaration would simply cancel the first.
   */
  const loopRef = useCallback(
    (node: HTMLElement | null) => {
      if (!node || !looping) return;

      const start = () => {
        // Set the timing here, not in the style prop: the entrance reads its
        // duration from a CSS var, and an inline animation-duration would
        // override it and break the entrance before it ever ran.
        node.style.animationDuration = `${config!.loopDuration ?? 2000}ms`;
        node.style.animationDelay = `${config!.loopDelay ?? 0}ms`;
        node.setAttribute("data-loop", config!.loop!);
        node.removeAttribute("data-anim");
        node.classList.remove("anim-play");
      };

      if (!active) {
        start();
        return;
      }
      node.addEventListener("animationend", start, { once: true });
      // A never-played entrance (off-screen forever) must not block the loop
      const guard = setTimeout(start, (config!.delay || 0) + (config!.duration || 700) + 4000);
      return () => {
        clearTimeout(guard);
        node.removeEventListener("animationend", start);
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [looping, active, config?.loop, config?.duration, config?.delay],
  );

  const combinedRef = useCallback(
    (node: HTMLElement | null) => {
      setRef(node);
      loopRef(node);
    },
    [setRef, loopRef],
  );

  if (!active && !looping) {
    return { setRef: undefined, animProps: {} as Record<string, any> };
  }

  return {
    setRef: combinedRef,
    animProps: {
      ...(active ? { "data-anim": config!.type } : {}),
      style: (active
        ? {
            ["--anim-name" as any]: `anim-${config!.type}`,
            ["--anim-dur" as any]: `${config!.duration}ms`,
            ["--anim-delay" as any]: `${config!.delay}ms`,
            ["--anim-ease" as any]: easingCss(config!.easing),
          }
        : {}) as React.CSSProperties,
    },
  };
}
