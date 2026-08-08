"use client";

import { cn } from "@/lib/cn";

const DIMS = {
  sm: { w: 40, h: 24, knob: 18, inset: 3 },
  md: { w: 60, h: 34, knob: 26, inset: 4 },
};

/**
 * Non-interactive pill visual. Use inside an element that is already a
 * button (nesting buttons is invalid HTML).
 */
export function ToggleTrack({
  checked,
  size = "sm",
  tone = "accent",
  className,
}: {
  checked: boolean;
  size?: "sm" | "md";
  tone?: "accent" | "amber";
  className?: string;
}) {
  const d = DIMS[size];
  const travel = d.w - d.knob - d.inset * 2;
  const onColor =
    tone === "amber"
      ? "bg-amber-500 border-amber-400"
      : "bg-accent border-accent";

  return (
    <span
      aria-hidden
      style={{ width: d.w, height: d.h }}
      className={cn(
        "relative block shrink-0 rounded-full border transition-colors duration-300",
        checked ? onColor : "bg-white/10 border-white/15",
        className,
      )}
    >
      <span
        style={{
          width: d.knob,
          height: d.knob,
          top: d.inset - 1,
          left: d.inset,
          transform: `translateX(${checked ? travel : 0}px)`,
        }}
        className="absolute rounded-full bg-white shadow-lg transition-transform duration-300"
      />
    </span>
  );
}

/**
 * Pill switch. The knob is positioned with explicit pixel values (rather than
 * utility translate steps) so it can never slide past the capsule edge —
 * travel is always `width - knob - 2*inset`.
 */
export default function Toggle({
  checked,
  onChange,
  size = "md",
  tone = "accent",
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  size?: "sm" | "md";
  tone?: "accent" | "amber";
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const dims = DIMS[size];
  const travel = dims.w - dims.knob - dims.inset * 2;

  const onColor =
    tone === "amber"
      ? "bg-amber-500 border-amber-400"
      : "bg-accent border-accent";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{ width: dims.w, height: dims.h }}
      className={cn(
        "relative shrink-0 rounded-full border transition-colors duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        checked ? onColor : "bg-white/10 border-white/15",
        className,
      )}
    >
      <span
        style={{
          width: dims.knob,
          height: dims.knob,
          top: dims.inset - 1,
          left: dims.inset,
          transform: `translateX(${checked ? travel : 0}px)`,
        }}
        className="absolute rounded-full bg-white shadow-lg transition-transform duration-300"
      />
    </button>
  );
}
