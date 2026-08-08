"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, List } from "lucide-react";

export type ViewMode = "grid" | "list";

/**
 * Grid / list switch, matching the one on the readymade-solutions screen.
 *
 * The choice is remembered per screen: someone who prefers a dense list on
 * invoices usually still wants cards on packages, so one global setting
 * would be wrong.
 */
export default function ViewToggle({
  value,
  onChange,
  className = "",
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-1 ${className}`}
      role="group"
      aria-label="View mode"
    >
      {(
        [
          ["grid", LayoutGrid, "Grid view"],
          ["list", List, "List view"],
        ] as const
      ).map(([mode, Icon, label]) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          aria-label={label}
          aria-pressed={value === mode}
          title={label}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            value === mode
              ? "bg-accent text-white"
              : "text-gray-500 hover:text-white hover:bg-white/10"
          }`}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}

/**
 * Remembers the mode across visits. `storageKey` should name the screen,
 * e.g. "invoices" — see the note above about why this isn't global.
 */
export function useViewMode(storageKey: string, initial: ViewMode = "grid") {
  const [mode, setMode] = useState<ViewMode>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`view:${storageKey}`);
      if (saved === "grid" || saved === "list") setMode(saved);
    } catch {
      // private mode / storage disabled — the default is fine
    }
    setReady(true);
  }, [storageKey]);

  const update = (v: ViewMode) => {
    setMode(v);
    try {
      localStorage.setItem(`view:${storageKey}`, v);
    } catch {
      /* ignore */
    }
  };

  return [mode, update, ready] as const;
}
