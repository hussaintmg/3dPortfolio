"use client";

import { createElement, useCallback } from "react";
import { useSite } from "@/context/SiteContext";
import { useReveal } from "@/hooks/useReveal";
import { cn } from "@/lib/cn";

interface EditableTextProps {
  /** Unique content key, e.g. "home.hero.heading". */
  k: string;
  /** Element to render — keeps the page's exact markup/styling. */
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  /** Default text shown until the owner overrides it. */
  children: string;
  style?: React.CSSProperties;
  /** Friendly name in the style panel header. */
  label?: string;
}

/**
 * Text that the owner can rewrite in place AND restyle.
 *
 * Normal visitors just see text. With maintenance mode on, the owner can
 * enable edit mode: the very same element becomes contentEditable (no popup,
 * no separate input) and clicking it opens the style panel.
 */
export default function EditableText({
  k,
  as = "span",
  className,
  children,
  style,
  label,
}: EditableTextProps) {
  const {
    getText,
    getStyle,
    getLink,
    getAnimation,
    isEditing,
    registerEdit,
    resetToken,
    contentVersion,
    selection,
    select,
  } = useSite();
  // read so a style/link tweak re-renders this element in place
  void contentVersion;
  const text = getText(k, children);
  const link = getLink(k);
  const linkActive = !!link?.enabled && !!link.href;
  const { setRef, animProps } = useReveal(getAnimation(k));

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLElement>) => {
      registerEdit(k, (e.currentTarget as HTMLElement).innerText.trim());
    },
    [k, registerEdit],
  );

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLElement>) => {
    // Paste as plain text so pasted HTML can't break the design
    e.preventDefault();
    const plain = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, plain);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    // Keep blocks single-flow: Enter would inject nested divs/brs
    if (e.key === "Enter") e.preventDefault();
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!isEditing) return;
      e.stopPropagation();
      select({
        key: k,
        label: label || k.split(".").slice(-1)[0],
        editableText: true,
        el: e.currentTarget as HTMLElement,
      });
    },
    [isEditing, k, label, select],
  );

  const isSelected = selection?.key === k;

  const element = createElement(
    as,
    {
      ...animProps,
      ref: setRef,
      // Remount only on save/discard — a style tweak must not steal the caret
      key: `${k}-${resetToken}-${isEditing ? "edit" : "view"}`,
      className: cn(
        className,
        // Clean by default — the outline only appears on hover, so the page
        // still looks like the real site while editing.
        isEditing &&
          "cursor-text rounded-sm min-w-[1ch] outline-offset-4 transition-[outline-color,box-shadow] duration-150 outline-dashed outline-1 outline-transparent hover:outline-accent",
        isEditing &&
          isSelected &&
          "outline-solid outline-2 outline-accent shadow-[0_0_0_4px_rgba(99,102,241,0.15)]",
      ),
      style: {
        ...(animProps.style || {}),
        ...(getStyle(k) || {}),
        ...(style || {}),
      },
      contentEditable: isEditing || undefined,
      suppressContentEditableWarning: true,
      spellCheck: false,
      onInput: isEditing ? handleInput : undefined,
      onPaste: isEditing ? handlePaste : undefined,
      onKeyDown: isEditing ? handleKeyDown : undefined,
      onClick: isEditing ? handleClick : undefined,
      "data-editable-key": k,
    },
    text,
  );

  // An owner-attached link wraps the element rather than replacing it, so
  // headings/paragraphs keep their tag (and their styling).
  if (!linkActive) return element;

  return createElement(
    "a",
    {
      href: link!.href,
      ...(link!.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {}),
      className: "inline-block no-underline",
      // While editing, clicking must select — not navigate away
      onClick: isEditing ? (e: React.MouseEvent) => e.preventDefault() : undefined,
    },
    element,
  );
}
