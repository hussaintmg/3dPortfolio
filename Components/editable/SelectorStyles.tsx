"use client";

import { useEffect, useMemo } from "react";
import { useSite } from "@/context/SiteContext";
import { cssText } from "@/lib/elementPath";

/**
 * Paints the owner's saved styling for freely-picked elements.
 *
 * Elements chosen with the picker aren't React components we control, so
 * their styles can't be spread into a `style` prop — they're emitted as a
 * real stylesheet instead, keyed by the selector we stored. Rendering this
 * during SSR is what keeps the styling from flashing in after hydration.
 */
export default function SelectorStyles() {
  const { styles, getStyle, getLink, links, contentVersion } = useSite();

  const emittedKeys = useMemo(
    () =>
      Object.keys(styles).filter(
        (k) => k.startsWith("sel:") || k.endsWith("::hover"),
      ),
    [styles],
  );

  /**
   * Turns a stored key into the CSS selector it addresses.
   *
   * `sel:` keys already carry a selector. Everything else is a component's
   * editable key, which only exists in the DOM as a data attribute — the
   * normal styles for those go through the component's `style` prop, but a
   * `:hover` state has no inline equivalent, so it has to come from here.
   */
  const toSelector = (key: string): string | null => {
    const hover = key.endsWith("::hover");
    const base = hover ? key.slice(0, -7) : key;
    const target = base.startsWith("sel:")
      ? base.slice(4)
      : `[data-editable-key="${CSS.escape(base)}"]`;
    if (!target) return null;
    return hover ? `${target}:hover` : target;
  };

  // Pending (unsaved) picks need painting too, so read through getStyle
  const sheet = useMemo(() => {
    const rules: string[] = [];
    for (const key of emittedKeys) {
      // A component key with no hover suffix already styles itself inline
      if (!key.startsWith("sel:") && !key.endsWith("::hover")) continue;
      const selector = toSelector(key);
      if (!selector) continue;
      const body = cssText((getStyle(key) || {}) as Record<string, string>);
      if (body) rules.push(`${selector}{${body}}`);
    }
    return rules.join("\n");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emittedKeys, contentVersion, getStyle]);

  /**
   * Links can't be expressed in CSS, so selector-keyed link overrides are
   * applied to the live DOM: anchors get a real href, anything else gets a
   * click handler so buttons and cards can navigate too.
   */
  useEffect(() => {
    const keys = Object.keys(links).filter((k) => k.startsWith("sel:"));
    const cleanups: (() => void)[] = [];

    for (const key of keys) {
      const cfg = getLink(key);
      if (!cfg?.href || cfg.enabled === false) continue;

      let el: HTMLElement | null = null;
      try {
        el = document.querySelector(key.slice(4));
      } catch {
        continue; // a stale selector is not worth throwing over
      }
      if (!el) continue;

      if (el instanceof HTMLAnchorElement) {
        const prevHref = el.getAttribute("href");
        const prevTarget = el.getAttribute("target");
        el.setAttribute("href", cfg.href);
        if (cfg.newTab) {
          el.setAttribute("target", "_blank");
          el.setAttribute("rel", "noopener noreferrer");
        }
        cleanups.push(() => {
          if (prevHref === null) el!.removeAttribute("href");
          else el!.setAttribute("href", prevHref);
          if (prevTarget === null) el!.removeAttribute("target");
          else el!.setAttribute("target", prevTarget);
        });
      } else {
        const node = el;
        const go = (e: MouseEvent) => {
          // Never hijack clicks while the owner is editing the page
          if (document.body.classList.contains("editor-picking")) return;
          e.preventDefault();
          if (cfg.newTab) window.open(cfg.href, "_blank", "noopener,noreferrer");
          else window.location.href = cfg.href;
        };
        node.addEventListener("click", go);
        const prevCursor = node.style.cursor;
        node.style.cursor = "pointer";
        cleanups.push(() => {
          node.removeEventListener("click", go);
          node.style.cursor = prevCursor;
        });
      }
    }

    return () => cleanups.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [links, contentVersion]);

  if (!sheet) return null;
  return <style data-selector-styles dangerouslySetInnerHTML={{ __html: sheet }} />;
}
