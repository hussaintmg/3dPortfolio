"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { GripVertical, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { SkeletonRow } from "./Skeleton";

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Extra classes for this column's cells. */
  className?: string;
  headerClassName?: string;
  /** Excluded from drag-reordering (e.g. a trailing actions column). */
  locked?: boolean;
}

interface DataTableProps<T> {
  /** Stable id — the saved column order is stored under this key. */
  tableKey: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
}

const storageKey = (k: string) => `dt-cols:${k}`;

/**
 * Table whose columns can be reordered by dragging a header onto another
 * header (dropped before or after depending on which half you release over),
 * or nudged with the ◀ ▶ buttons. The order is remembered per browser.
 */
export default function DataTable<T>({
  tableKey,
  columns,
  rows,
  rowKey,
  loading,
  emptyMessage = "Nothing here yet.",
  className,
  onRowClick,
}: DataTableProps<T>) {
  const [order, setOrder] = useState<string[]>(() => columns.map((c) => c.id));
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<{ id: string; side: "left" | "right" } | null>(null);
  const [restored, setRestored] = useState(false);
  /**
   * Drag bookkeeping also lives in refs: dragstart → dragover can fire in the
   * same tick (and always does for synthetic events), before React has
   * flushed the state update.
   */
  const dragIdRef = useRef<string | null>(null);
  const dropHintRef = useRef<{ id: string; side: "left" | "right" } | null>(null);

  // Restore a saved order once on mount, dropping ids that no longer exist
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(tableKey));
      if (saved) {
        const ids: string[] = JSON.parse(saved);
        const valid = ids.filter((id) => columns.some((c) => c.id === id));
        const missing = columns.map((c) => c.id).filter((id) => !valid.includes(id));
        if (valid.length) setOrder([...valid, ...missing]);
      }
    } catch {
      // corrupt value — just use the natural order
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey]);

  // Keep order in sync when the column set itself changes
  useEffect(() => {
    setOrder((prev) => {
      const valid = prev.filter((id) => columns.some((c) => c.id === id));
      const missing = columns.map((c) => c.id).filter((id) => !valid.includes(id));
      return missing.length ? [...valid, ...missing] : valid;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns.map((c) => c.id).join("|")]);

  const persist = useCallback(
    (next: string[]) => {
      setOrder(next);
      try {
        localStorage.setItem(storageKey(tableKey), JSON.stringify(next));
      } catch {}
    },
    [tableKey],
  );

  const ordered = useMemo(
    () =>
      order
        .map((id) => columns.find((c) => c.id === id))
        .filter(Boolean) as Column<T>[],
    [order, columns],
  );

  const move = (id: string, dir: -1 | 1) => {
    const idx = order.indexOf(id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= order.length) return;
    if (columns.find((c) => c.id === order[target])?.locked) return;
    const next = [...order];
    [next[idx], next[target]] = [next[target], next[idx]];
    persist(next);
  };

  const handleDrop = (targetId: string, side: "left" | "right") => {
    const moving = dragIdRef.current;
    if (!moving || moving === targetId) return;
    const next = order.filter((id) => id !== moving);
    const targetIdx = next.indexOf(targetId);
    next.splice(side === "left" ? targetIdx : targetIdx + 1, 0, moving);
    persist(next);
  };

  const resetOrder = () => {
    persist(columns.map((c) => c.id));
  };

  const isCustomOrder =
    restored && order.join("|") !== columns.map((c) => c.id).join("|");

  return (
    <div className={cn("rounded-3xl border border-white/10 bg-card overflow-hidden", className)}>
      {isCustomOrder && (
        <div className="flex items-center justify-between px-6 py-2.5 bg-accent/5 border-b border-white/5">
          <span className="text-[10px] font-black uppercase tracking-widest text-accent">
            Custom column order
          </span>
          <button
            onClick={resetOrder}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
          >
            <RotateCcw size={11} /> Reset
          </button>
        </div>
      )}

      <div className="overflow-x-auto custom-scrollbar" data-lenis-prevent>
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead className="bg-[#0A0A0A] border-b border-white/5">
            <tr>
              {ordered.map((col) => {
                const isDragging = dragId === col.id;
                const hint = dropHint?.id === col.id ? dropHint.side : null;
                return (
                  <th
                    key={col.id}
                    draggable={!col.locked}
                    onDragStart={(e) => {
                      if (col.locked) return;
                      dragIdRef.current = col.id;
                      setDragId(col.id);
                      if (e.dataTransfer) {
                        e.dataTransfer.effectAllowed = "move";
                        // Firefox needs data set for dragging to start
                        e.dataTransfer.setData("text/plain", col.id);
                      }
                    }}
                    onDragEnd={() => {
                      dragIdRef.current = null;
                      dropHintRef.current = null;
                      setDragId(null);
                      setDropHint(null);
                    }}
                    onDragOver={(e) => {
                      const moving = dragIdRef.current;
                      if (col.locked || !moving || moving === col.id) return;
                      e.preventDefault();
                      const r = e.currentTarget.getBoundingClientRect();
                      const side =
                        e.clientX < r.left + r.width / 2 ? "left" : "right";
                      dropHintRef.current = { id: col.id, side };
                      setDropHint({ id: col.id, side });
                    }}
                    onDragLeave={() => {
                      if (dropHintRef.current?.id === col.id)
                        dropHintRef.current = null;
                      setDropHint(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const side =
                        dropHintRef.current?.id === col.id
                          ? dropHintRef.current.side
                          : (() => {
                              const r = e.currentTarget.getBoundingClientRect();
                              return e.clientX < r.left + r.width / 2
                                ? ("left" as const)
                                : ("right" as const);
                            })();
                      handleDrop(col.id, side);
                      dragIdRef.current = null;
                      dropHintRef.current = null;
                      setDragId(null);
                      setDropHint(null);
                    }}
                    className={cn(
                      "relative px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 select-none transition-colors",
                      !col.locked && "cursor-grab active:cursor-grabbing group",
                      isDragging && "opacity-40",
                      hint === "left" && "shadow-[inset_3px_0_0_0_var(--color-accent)]",
                      hint === "right" && "shadow-[inset_-3px_0_0_0_var(--color-accent)]",
                      col.headerClassName,
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {!col.locked && (
                        <GripVertical
                          size={13}
                          className="text-gray-700 group-hover:text-accent transition-colors shrink-0"
                        />
                      )}
                      <span className="truncate">{col.header}</span>
                      {!col.locked && (
                        <span className="ml-auto flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => move(col.id, -1)}
                            title="Move left"
                            className="p-0.5 rounded text-gray-600 hover:text-white hover:bg-white/10"
                          >
                            <ChevronLeft size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(col.id, 1)}
                            title="Move right"
                            className="p-0.5 rounded text-gray-600 hover:text-white hover:bg-white/10"
                          >
                            <ChevronRight size={13} />
                          </button>
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={ordered.length} className="p-0">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonRow key={i} cols={ordered.length} />
                  ))}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={ordered.length}
                  className="px-8 py-12 text-center text-sm font-medium text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "group hover:bg-white/5 transition-colors",
                    onRowClick && "cursor-pointer",
                  )}
                >
                  {ordered.map((col) => (
                    <td key={col.id} className={cn("px-6 py-5", col.className)}>
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-2.5 border-t border-white/5 bg-white/2">
        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
          Tip: drag a column header onto another to reorder
        </p>
      </div>
    </div>
  );
}
