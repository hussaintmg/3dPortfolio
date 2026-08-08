"use client";

import { useState } from "react";
import {
  Type,
  Image as ImageIcon,
  Square,
  Minus,
  QrCode,
  Table,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import { DesignElement } from "@/lib/pdfDesigner";
import { cn } from "@/lib/cn";

/** Falls back to the element's own words so layers read like the page. */
function layerLabel(el: DesignElement, indexOfType: number) {
  if (el.name) return el.name;
  if (el.type === "text") {
    const plain = (el.props.text || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (plain) return plain.length > 26 ? plain.slice(0, 26) + "…" : plain;
  }
  if (el.type === "qr") return "QR code";
  if (el.type === "table") return "Items table";
  if (el.type === "shape") return `${el.props.shape || "Rect"} shape`;
  return `${el.type[0].toUpperCase()}${el.type.slice(1)} ${indexOfType}`;
}

const ICONS: Record<string, React.ReactNode> = {
  text: <Type size={12} />,
  image: <ImageIcon size={12} />,
  shape: <Square size={12} />,
  line: <Minus size={12} />,
  qr: <QrCode size={12} />,
  table: <Table size={12} />,
};

interface Props {
  elements: DesignElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onPatch: (id: string, patch: Partial<DesignElement>) => void;
}

/**
 * Stacking-order panel. The list is drawn top-most first (the end of the
 * elements array paints last), and rows can be dragged to restack.
 */
export default function LayersPanel({
  elements,
  selectedId,
  onSelect,
  onReorder,
  onPatch,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Topmost layer first; count per type for the fallback naming
  const seen: Record<string, number> = {};
  const rows = elements
    .map((el, i) => {
      seen[el.type] = (seen[el.type] || 0) + 1;
      return { el, i, label: layerLabel(el, seen[el.type]) };
    })
    .reverse();

  return (
    <div className="border-t border-white/8">
      <div className="px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-white">
          Layers
        </span>
        <span className="text-[9px] font-bold text-gray-600">
          {elements.length}
        </span>
      </div>

      <div className="max-h-64 overflow-y-auto custom-scrollbar pb-2" data-lenis-prevent>
        {rows.length === 0 && (
          <p className="px-4 py-3 text-[10px] text-gray-600 font-medium">
            Nothing on the page yet — add an element from the toolbar.
          </p>
        )}

        {rows.map(({ el, i, label }) => {
          const selected = el.id === selectedId;
          return (
            <div
              key={el.id}
              draggable={!el.locked}
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(i);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null && dragIndex !== i) onReorder(dragIndex, i);
                setDragIndex(null);
                setOverIndex(null);
              }}
              onClick={() => onSelect(el.id)}
              className={cn(
                "group flex items-center gap-2 px-3 py-2 cursor-pointer border-l-2 transition-colors",
                selected
                  ? "bg-accent/12 border-accent"
                  : "border-transparent hover:bg-white/5",
                overIndex === i && dragIndex !== null && "bg-accent/20",
                dragIndex === i && "opacity-40",
              )}
            >
              <GripVertical
                size={11}
                className="text-gray-700 group-hover:text-gray-500 shrink-0"
              />
              <span
                className={cn(
                  "shrink-0",
                  selected ? "text-accent" : "text-gray-500",
                )}
              >
                {ICONS[el.type]}
              </span>
              <span
                className={cn(
                  "flex-1 min-w-0 truncate text-[11px] font-bold",
                  el.hidden ? "text-gray-700 line-through" : "text-gray-200",
                )}
              >
                {label}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPatch(el.id, { hidden: !el.hidden });
                }}
                title={el.hidden ? "Show" : "Hide"}
                className="p-1 rounded text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {el.hidden ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPatch(el.id, { locked: !el.locked });
                }}
                title={el.locked ? "Unlock" : "Lock"}
                className={cn(
                  "p-1 rounded transition-opacity",
                  el.locked
                    ? "text-amber-400 opacity-100"
                    : "text-gray-600 hover:text-white opacity-0 group-hover:opacity-100",
                )}
              >
                {el.locked ? <Lock size={11} /> : <Unlock size={11} />}
              </button>
              <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (i < elements.length - 1) onReorder(i, i + 1);
                  }}
                  title="Bring forward"
                  className="p-0.5 rounded text-gray-600 hover:text-white"
                >
                  <ChevronUp size={10} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (i > 0) onReorder(i, i - 1);
                  }}
                  title="Send backward"
                  className="p-0.5 rounded text-gray-600 hover:text-white"
                >
                  <ChevronDown size={10} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
