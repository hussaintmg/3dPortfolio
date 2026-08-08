"use client";

import { createElement, useCallback, ReactNode } from "react";
import { useSite } from "@/context/SiteContext";
import { useReveal } from "@/hooks/useReveal";
import { cn } from "@/lib/cn";

interface EditableBoxProps {
  /** Unique style key, e.g. "home.hero.cta1.button". */
  k: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
  /** Friendly name shown in the style panel header. */
  label?: string;
  /** Extra props forwarded to the rendered element (href, onClick, …). */
  [key: string]: any;
}

/**
 * Style-and-link editable wrapper for anything that is not a single text run —
 * buttons, cards, tables, sections, images. In edit mode a click selects it
 * and opens the panel; outside edit mode it is a plain element (or a real
 * anchor when the owner has attached a link to it).
 */
export default function EditableBox({
  k,
  as = "div",
  className,
  style,
  children,
  label,
  ...rest
}: EditableBoxProps) {
  const {
    getStyle,
    getLink,
    getAnimation,
    isEditing,
    selection,
    select,
    contentVersion,
  } = useSite();
  // read so a style/link tweak re-renders this element in place
  void contentVersion;

  const link = getLink(k);
  const linkActive = !!link?.enabled && !!link.href;
  const { setRef, animProps } = useReveal(getAnimation(k));

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!isEditing) {
        rest.onClick?.(e);
        return;
      }
      // In edit mode a click means "select this", never "navigate"
      e.preventDefault();
      e.stopPropagation();
      select({
        key: k,
        label: label || k.split(".").slice(-1)[0],
        editableText: false,
        el: e.currentTarget as HTMLElement,
      });
    },
    [isEditing, k, label, select, rest],
  );

  const isSelected = selection?.key === k;

  // An owner-set link wins over any href passed in by the page
  const tag: keyof React.JSX.IntrinsicElements = linkActive ? "a" : as;
  const linkProps = linkActive
    ? {
        href: link!.href,
        ...(link!.newTab
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {}),
      }
    : {};

  return createElement(
    tag,
    {
      ...rest,
      ...linkProps,
      ...animProps,
      ref: setRef,
      className: cn(
        className,
        // Invisible until hovered, so edit mode doesn't disfigure the page
        isEditing &&
          "cursor-pointer outline-offset-2 transition-[outline-color,box-shadow] duration-150 outline-dashed outline-1 outline-transparent hover:outline-purple-400",
        isEditing &&
          isSelected &&
          "outline-solid outline-2 outline-accent shadow-[0_0_0_4px_rgba(99,102,241,0.15)]",
      ),
      style: {
        ...(animProps.style || {}),
        ...(getStyle(k) || {}),
        ...(style || {}),
      },
      onClick: handleClick,
      "data-editable-key": k,
    },
    children,
  );
}
