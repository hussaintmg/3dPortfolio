"use client";

import { useEffect, useRef } from "react";
import { useSite } from "@/context/SiteContext";
import {
  getElementPath,
  pathKey,
  describeElement,
  isEditorChrome,
} from "@/lib/elementPath";

/**
 * Makes EVERY element on the page selectable while edit mode is on —
 * buttons, cards, icons, images, navbar, footer, sidebar, shapes.
 *
 * Elements that already carry a `data-editable-key` keep their own click
 * behaviour (that's how in-place text editing works); the picker only claims
 * everything else. Alt-click walks up to the parent so a container can be
 * grabbed without hunting for a gap between its children.
 */
export default function ElementPicker() {
  const { canEdit, isEditing, select, selection } = useSite();
  const hoverRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!canEdit || !isEditing) return;

    const HOVER = "editor-hover-target";

    const clearHover = () => {
      hoverRef.current?.classList.remove(HOVER);
      hoverRef.current = null;
    };

    /** The element we would act on for a given event, or null to ignore. */
    const resolve = (e: Event, walkUp: boolean): HTMLElement | null => {
      const target = e.target as HTMLElement | null;
      if (!target || target.nodeType !== 1) return null;
      if (isEditorChrome(target)) return null;
      // Text elements own their clicks already
      if (target.closest("[data-editable-key]")) return null;
      if (target === document.body || target === document.documentElement)
        return null;

      let el: HTMLElement = target;
      if (walkUp && el.parentElement && el.parentElement !== document.body) {
        el = el.parentElement;
      }
      return el;
    };

    const onOver = (e: MouseEvent) => {
      const el = resolve(e, e.altKey);
      if (el === hoverRef.current) return;
      clearHover();
      if (!el) return;
      el.classList.add(HOVER);
      hoverRef.current = el;
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;

      /**
       * Nothing navigates or submits while the page is being edited — not
       * even links the picker won't claim, like the ones inside text
       * elements. Losing the page mid-edit throws away unsaved changes.
       */
      if (target && !isEditorChrome(target)) {
        if (target.closest("a[href], button[type='submit'], form")) {
          e.preventDefault();
        }
      }

      const el = resolve(e, e.altKey);
      if (!el) return;

      const path = getElementPath(el);
      if (!path) return;

      e.preventDefault();
      e.stopPropagation();

      select({
        key: pathKey(path),
        label: describeElement(el),
        editableText: false,
        el,
      });
    };

    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("click", onClick, true);
    document.body.classList.add("editor-picking");

    return () => {
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("click", onClick, true);
      document.body.classList.remove("editor-picking");
      clearHover();
    };
  }, [canEdit, isEditing, select]);

  // Keep a persistent ring on whatever is currently selected
  useEffect(() => {
    const el = selection?.el;
    if (!el) return;
    el.classList.add("editor-selected-target");
    return () => el.classList.remove("editor-selected-target");
  }, [selection]);

  return null;
}
