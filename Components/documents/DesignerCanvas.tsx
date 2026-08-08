"use client";

import { useCallback, useRef, useState } from "react";
import { DesignDoc, DesignElement, SHAPE_CLIP } from "@/lib/pdfDesigner";
import { cn } from "@/lib/cn";

interface Props {
  design: DesignDoc;
  selectedId: string | null;
  zoom: number;
  onSelect: (id: string | null) => void;
  /** Live updates while dragging (not pushed onto the undo stack). */
  onChange: (design: DesignDoc) => void;
  /** Called once when a drag/resize gesture finishes. */
  onCommit?: () => void;
}

const GRID = 2;
const SNAP_TOLERANCE = 6;
const snap = (n: number) => Math.round(n / GRID) * GRID;

interface Guide {
  axis: "x" | "y";
  at: number;
}

/**
 * Page canvas: elements are dragged, resized and rotated directly, with
 * smart guides that snap to the page centre, page edges and the edges/centres
 * of every other element.
 */
export default function DesignerCanvas({
  design,
  selectedId,
  zoom,
  onSelect,
  onChange,
  onCommit,
}: Props) {
  const [gesture, setGesture] = useState<{
    id: string;
    mode: "move" | "resize" | "rotate";
    startX: number;
    startY: number;
    orig: DesignElement;
  } | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const liveRef = useRef<DesignDoc>(design);
  liveRef.current = design;

  const patch = useCallback(
    (id: string, next: Partial<DesignElement>) => {
      onChange({
        ...liveRef.current,
        elements: liveRef.current.elements.map((e) =>
          e.id === id ? { ...e, ...next } : e,
        ),
      });
    },
    [onChange],
  );

  /** Candidate snap lines from the page and every other element. */
  const snapTargets = useCallback(
    (excludeId: string) => {
      const xs: number[] = [0, design.page.width / 2, design.page.width];
      const ys: number[] = [0, design.page.height / 2, design.page.height];
      xs.push(design.page.padding, design.page.width - design.page.padding);
      ys.push(design.page.padding, design.page.height - design.page.padding);

      for (const el of design.elements) {
        if (el.id === excludeId || el.hidden) continue;
        xs.push(el.x, el.x + el.w / 2, el.x + el.w);
        ys.push(el.y, el.y + el.h / 2, el.y + el.h);
      }
      return { xs, ys };
    },
    [design],
  );

  const applySnap = (
    el: { x: number; y: number; w: number; h: number },
    excludeId: string,
  ) => {
    const { xs, ys } = snapTargets(excludeId);
    const found: Guide[] = [];
    let { x, y } = el;

    // Try snapping the left edge, centre and right edge
    const xCandidates = [
      { edge: x, offset: 0 },
      { edge: x + el.w / 2, offset: el.w / 2 },
      { edge: x + el.w, offset: el.w },
    ];
    for (const c of xCandidates) {
      const hit = xs.find((t) => Math.abs(t - c.edge) <= SNAP_TOLERANCE);
      if (hit !== undefined) {
        x = hit - c.offset;
        found.push({ axis: "x", at: hit });
        break;
      }
    }

    const yCandidates = [
      { edge: y, offset: 0 },
      { edge: y + el.h / 2, offset: el.h / 2 },
      { edge: y + el.h, offset: el.h },
    ];
    for (const c of yCandidates) {
      const hit = ys.find((t) => Math.abs(t - c.edge) <= SNAP_TOLERANCE);
      if (hit !== undefined) {
        y = hit - c.offset;
        found.push({ axis: "y", at: hit });
        break;
      }
    }

    return { x, y, guides: found };
  };

  const startGesture = (
    e: React.PointerEvent,
    el: DesignElement,
    mode: "move" | "resize" | "rotate",
  ) => {
    if (el.locked) return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    onSelect(el.id);
    setGesture({
      id: el.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...el },
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!gesture) return;
    const dx = (e.clientX - gesture.startX) / zoom;
    const dy = (e.clientY - gesture.startY) / zoom;
    const o = gesture.orig;

    if (gesture.mode === "move") {
      const raw = { x: snap(o.x + dx), y: snap(o.y + dy), w: o.w, h: o.h };
      // Holding Shift disables snapping for fine placement
      const s = e.shiftKey
        ? { ...raw, guides: [] as Guide[] }
        : applySnap(raw, o.id);
      setGuides(s.guides);
      patch(gesture.id, { x: Math.round(s.x), y: Math.round(s.y) });
    } else if (gesture.mode === "resize") {
      patch(gesture.id, {
        w: Math.max(8, snap(o.w + dx)),
        h: Math.max(4, snap(o.h + dy)),
      });
    } else {
      // Angle from the element's centre to the pointer
      const cx = o.x + o.w / 2;
      const cy = o.y + o.h / 2;
      const px = o.x + o.w / 2 + dx + (gesture.startX - gesture.startX);
      void px;
      const angle =
        (Math.atan2(o.y - 24 + dy - cy, o.x + o.w / 2 + dx - cx) * 180) /
          Math.PI +
        90;
      const stepped = e.shiftKey ? Math.round(angle / 15) * 15 : Math.round(angle);
      patch(gesture.id, { rotation: stepped });
    }
  };

  const endGesture = () => {
    if (gesture) onCommit?.();
    setGesture(null);
    setGuides([]);
  };

  /** Dropping a variable chip binds it to the element it lands on. */
  const onDropVariable = (e: React.DragEvent, el: DesignElement) => {
    const token =
      e.dataTransfer.getData("application/x-variable") ||
      e.dataTransfer.getData("text/plain");
    if (!token || !token.startsWith("{{")) return;
    e.preventDefault();
    e.stopPropagation();

    if (el.type === "text") {
      patch(el.id, {
        props: { ...el.props, text: (el.props.text || "") + " " + token },
      });
    } else if (el.type === "image") {
      patch(el.id, { props: { ...el.props, src: token } });
    } else if (el.type === "qr") {
      patch(el.id, { props: { ...el.props, url: token } });
    }
    onCommit?.();
  };

  const renderElement = (el: DesignElement, z: number) => {
    if (el.hidden) return null;
    const selected = el.id === selectedId;
    const isEditing = editingId === el.id;

    const frame: React.CSSProperties = {
      position: "absolute",
      left: el.x,
      top: el.y,
      width: el.w,
      height: el.h,
      zIndex: z,
      transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
      cursor: el.locked ? "not-allowed" : isEditing ? "text" : "move",
      ...(el.style as React.CSSProperties),
    };

    const handlers = {
      onPointerDown: (e: React.PointerEvent) => {
        if (isEditing) return;
        startGesture(e, el, "move");
      },
      onDoubleClick: (e: React.MouseEvent) => {
        if (el.type !== "text" || el.locked) return;
        e.stopPropagation();
        setEditingId(el.id);
      },
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDrop: (e: React.DragEvent) => onDropVariable(e, el),
    };

    const ring = cn(
      "select-none",
      selected
        ? "outline outline-2 outline-accent"
        : "outline outline-1 outline-transparent hover:outline-accent/40",
      el.locked && "cursor-not-allowed",
    );

    let node: React.ReactNode = null;

    switch (el.type) {
      case "text":
        node = isEditing ? (
          <div
            style={frame}
            className={cn(ring, "outline-2 outline-emerald-400")}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              patch(el.id, {
                props: { ...el.props, text: e.currentTarget.innerHTML },
              });
              setEditingId(null);
              onCommit?.();
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") (e.target as HTMLElement).blur();
              e.stopPropagation();
            }}
            dangerouslySetInnerHTML={{ __html: el.props.text || "" }}
          />
        ) : (
          <div
            {...handlers}
            style={frame}
            className={ring}
            dangerouslySetInnerHTML={{ __html: el.props.text || "" }}
          />
        );
        break;

      case "image":
        node =
          el.props.src && !el.props.src.includes("{{") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img {...handlers} style={frame} className={ring} src={el.props.src} alt="" />
          ) : (
            <div
              {...handlers}
              style={frame}
              className={cn(
                ring,
                "flex items-center justify-center bg-black/5 border border-dashed border-black/20 text-[10px] font-bold text-black/40 text-center px-2",
              )}
            >
              {el.props.src || "Image"}
            </div>
          );
        break;

      case "shape": {
        const kind = el.props.shape || "rect";
        node = (
          <div
            {...handlers}
            style={{
              ...frame,
              borderRadius: kind === "ellipse" ? "50%" : frame.borderRadius,
              clipPath: SHAPE_CLIP[kind] || undefined,
            }}
            className={ring}
          />
        );
        break;
      }

      case "line":
        node = <div {...handlers} style={frame} className={ring} />;
        break;

      case "qr":
        node = (
          <div
            {...handlers}
            style={frame}
            className={cn(
              ring,
              "flex flex-col items-center justify-center bg-black/5 border border-dashed border-black/25 text-[9px] font-bold text-black/50 text-center p-1 gap-1",
            )}
          >
            <span className="text-lg leading-none">▦</span>
            QR
          </div>
        );
        break;

      case "table":
        node = (
          <div {...handlers} style={frame} className={cn(ring, "overflow-hidden")}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {(el.props.columns || "Column").split("|").map((c, i) => (
                    <th
                      key={i}
                      style={{
                        textAlign: "left",
                        padding: "8px 6px",
                        borderBottom: "1px solid #e5e7eb",
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: ".08em",
                        color: "#6b7280",
                      }}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2].map((r) => (
                  <tr key={r}>
                    {(el.props.columns || "Column").split("|").map((_, i) => (
                      <td
                        key={i}
                        style={{
                          padding: "9px 6px",
                          borderBottom: "1px solid #f3f4f6",
                          color: "#9ca3af",
                        }}
                      >
                        Row data
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        break;
    }

    return <div key={el.id}>{node}</div>;
  };

  const selected = design.elements.find((e) => e.id === selectedId);

  return (
    <div
      className="flex-1 overflow-auto custom-scrollbar bg-[#0a0a12] p-10"
      data-lenis-prevent
    >
      <div
        className="mx-auto shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
        style={{
          width: design.page.width * zoom,
          height: design.page.height * zoom,
        }}
      >
        <div
          onPointerMove={onPointerMove}
          onPointerUp={endGesture}
          onPointerLeave={endGesture}
          onClick={() => {
            onSelect(null);
            setEditingId(null);
          }}
          style={{
            width: design.page.width,
            height: design.page.height,
            background: design.page.background,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Printable-area guide */}
          <div
            className="pointer-events-none absolute border border-dashed border-black/10"
            style={{
              left: design.page.padding,
              top: design.page.padding,
              right: design.page.padding,
              bottom: design.page.padding,
            }}
          />

          {design.elements.map((el, i) => renderElement(el, i + 1))}

          {/* Smart guides */}
          {guides.map((g, i) =>
            g.axis === "x" ? (
              <div
                key={`gx${i}`}
                className="pointer-events-none absolute bg-fuchsia-500"
                style={{ left: g.at, top: 0, width: 1, height: "100%", zIndex: 9998 }}
              />
            ) : (
              <div
                key={`gy${i}`}
                className="pointer-events-none absolute bg-fuchsia-500"
                style={{ top: g.at, left: 0, height: 1, width: "100%", zIndex: 9998 }}
              />
            ),
          )}

          {/* Selection handles */}
          {selected && !selected.locked && !selected.hidden && (
            <div
              className="pointer-events-none absolute"
              style={{
                left: selected.x,
                top: selected.y,
                width: selected.w,
                height: selected.h,
                transform: selected.rotation
                  ? `rotate(${selected.rotation}deg)`
                  : undefined,
                zIndex: 9999,
              }}
            >
              <div
                onPointerDown={(e) => startGesture(e, selected, "resize")}
                className="pointer-events-auto absolute rounded-sm bg-accent border-2 border-white shadow"
                style={{ right: -7, bottom: -7, width: 14, height: 14, cursor: "nwse-resize" }}
              />
              <div
                onPointerDown={(e) => startGesture(e, selected, "rotate")}
                title="Rotate (hold Shift for 15° steps)"
                className="pointer-events-auto absolute rounded-full bg-emerald-400 border-2 border-white shadow"
                style={{
                  left: "50%",
                  top: -28,
                  marginLeft: -7,
                  width: 14,
                  height: 14,
                  cursor: "grab",
                }}
              />
              <div
                className="absolute bg-emerald-400/60"
                style={{ left: "50%", top: -21, width: 1, height: 21 }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
