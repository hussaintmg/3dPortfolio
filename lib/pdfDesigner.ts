/**
 * Shared model for the PDF designer and its HTML code view.
 *
 * Every designer element serialises to a single DOM node carrying
 * `data-el` / `data-id` attributes, and parsing reads those attributes back.
 * That round-trip is what keeps the Designer and HTML tabs in sync.
 */

export type ElementType = "text" | "image" | "shape" | "line" | "qr" | "table";

export type ShapeKind =
  | "rect"
  | "ellipse"
  | "triangle"
  | "diamond"
  | "star"
  | "hexagon"
  | "arrow";

/** clip-path polygons for the shapes CSS can't draw with a border-radius. */
export const SHAPE_CLIP: Record<string, string> = {
  triangle: "polygon(50% 0%, 100% 100%, 0% 100%)",
  diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  star: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
  hexagon: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
  arrow: "polygon(0% 25%, 60% 25%, 60% 0%, 100% 50%, 60% 100%, 60% 75%, 0% 75%)",
};

export interface DesignElement {
  id: string;
  type: ElementType;
  /** Friendly name shown in the layers panel. */
  name?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees, clockwise. */
  rotation?: number;
  /** Layers panel controls. */
  hidden?: boolean;
  locked?: boolean;
  props: {
    text?: string;
    src?: string;
    url?: string;
    shape?: ShapeKind;
    /** table: pipe-separated header row + {{rows}} placeholder */
    columns?: string;
  };
  style: Record<string, string>;
}

export interface DesignDoc {
  page: {
    width: number;
    height: number;
    background: string;
    padding: number;
  };
  elements: DesignElement[];
}

/** Page sizes at 96dpi — matches what the headless browser prints. */
export const PAGE_PRESETS = {
  a4: { width: 794, height: 1123 },
  letter: { width: 816, height: 1056 },
  a5: { width: 559, height: 794 },
  a4landscape: { width: 1123, height: 794 },
  receipt: { width: 384, height: 900 },
} as const;

export const PAGE_PRESET_LABELS: Record<string, string> = {
  a4: "A4 portrait",
  letter: "US Letter",
  a5: "A5",
  a4landscape: "A4 landscape",
  receipt: "Receipt (80mm)",
};

export const emptyDesign = (): DesignDoc => ({
  page: { ...PAGE_PRESETS.a4, background: "#ffffff", padding: 48 },
  elements: [],
});

let idCounter = 0;
/** Deterministic-ish unique id (no Date.now/random so SSR stays stable). */
export const newElementId = (existing: DesignElement[] = []) => {
  const used = new Set(existing.map((e) => e.id));
  let id: string;
  do {
    idCounter += 1;
    id = `el${idCounter}`;
  } while (used.has(id));
  return id;
};

export function elementDefaults(
  type: ElementType,
  existing: DesignElement[] = [],
): DesignElement {
  const count = existing.filter((e) => e.type === type).length + 1;
  const base = {
    id: newElementId(existing),
    name: `${type[0].toUpperCase()}${type.slice(1)} ${count}`,
    rotation: 0,
    x: 60,
    y: 60,
    w: 300,
    h: 48,
  };

  switch (type) {
    case "text":
      return {
        ...base,
        type,
        props: { text: "New text — use {{client.name}} for real data" },
        style: {
          fontSize: "16px",
          fontWeight: "400",
          color: "#111827",
          fontFamily: "Inter, Arial, sans-serif",
          lineHeight: "1.5",
          textAlign: "left",
        },
      };
    case "image":
      return {
        ...base,
        type,
        w: 180,
        h: 120,
        props: { src: "" },
        style: { objectFit: "contain", borderRadius: "0px" },
      };
    case "shape":
      return {
        ...base,
        type,
        w: 200,
        h: 120,
        props: { shape: "rect" },
        style: {
          backgroundColor: "#6366f1",
          borderRadius: "8px",
          opacity: "1",
        },
      };
    case "line":
      return {
        ...base,
        type,
        w: 400,
        h: 2,
        props: {},
        style: { backgroundColor: "#e5e7eb" },
      };
    case "qr":
      return {
        ...base,
        type,
        w: 120,
        h: 120,
        props: { url: "{{site.url}}" },
        style: {},
      };
    case "table":
      return {
        ...base,
        type,
        w: 600,
        h: 200,
        props: { columns: "Description|Qty|Rate|Amount" },
        style: {
          fontSize: "13px",
          color: "#111827",
          fontFamily: "Inter, Arial, sans-serif",
        },
      };
  }
}

const styleToCss = (style: Record<string, string>) =>
  Object.entries(style || {})
    .filter(([, v]) => v !== "" && v != null)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}:${v}`)
    .join(";");

const escapeAttr = (s: string) =>
  String(s || "").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Serialises one element to its canonical HTML node. */
function elementToHtml(el: DesignElement, zIndex: number): string {
  const rotate = el.rotation ? `transform:rotate(${el.rotation}deg);` : "";
  const hidden = el.hidden ? "display:none;" : "";
  const pos =
    `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;` +
    `z-index:${zIndex};${rotate}${hidden}`;
  const css = pos + styleToCss(el.style);

  const shape = el.props.shape || "rect";
  const extra: string[] = [`data-el="${el.type}"`, `data-id="${el.id}"`];
  if (el.name) extra.push(`data-name="${escapeAttr(el.name)}"`);
  if (el.rotation) extra.push(`data-rotation="${el.rotation}"`);
  if (el.locked) extra.push(`data-locked="1"`);
  if (el.hidden) extra.push(`data-hidden="1"`);
  const attrs = extra.join(" ");

  switch (el.type) {
    case "text":
      return `<div ${attrs} style="${css}">${el.props.text ?? ""}</div>`;
    case "image":
      return `<img ${attrs} src="${escapeAttr(el.props.src || "")}" style="${css}" alt="" />`;
    case "shape": {
      const clip = SHAPE_CLIP[shape] ? `;clip-path:${SHAPE_CLIP[shape]}` : "";
      const round = shape === "ellipse" ? ";border-radius:50%" : "";
      return `<div ${attrs} data-shape="${shape}" style="${css}${round}${clip}"></div>`;
    }
    case "line":
      return `<div ${attrs} style="${css}"></div>`;
    case "qr":
      // src is filled in by the backend when the document is rendered
      return `<img ${attrs} data-url="${escapeAttr(el.props.url || "")}" src="" style="${css}" alt="QR" />`;
    case "table":
      return `<div ${attrs} data-columns="${escapeAttr(el.props.columns || "")}" style="${css}">{{table:items}}</div>`;
    default:
      return "";
  }
}

/** Full standalone HTML for the document (used by both preview and print). */
export function designToHtml(design: DesignDoc, css = ""): string {
  const { page, elements } = design;
  // Array order IS the stacking order — index becomes z-index
  const body = elements
    .map((el, i) => elementToHtml(el, i + 1))
    .join("\n    ");

  return `<div class="pdf-page" style="position:relative;width:${page.width}px;min-height:${page.height}px;background:${page.background};padding:${page.padding}px;box-sizing:border-box;overflow:hidden;">
    ${body}
</div>${css ? `\n<style>\n${css}\n</style>` : ""}`;
}

/**
 * Reads canonical HTML back into designer elements.
 * Returns null when the markup has no recognisable elements — the editor then
 * tells the author that the HTML has drifted beyond what the designer models.
 */
export function htmlToDesign(
  html: string,
  fallbackPage?: DesignDoc["page"],
): DesignDoc | null {
  if (typeof window === "undefined") return null;

  const doc = new DOMParser().parseFromString(html, "text/html");
  const pageEl = doc.querySelector(".pdf-page") as HTMLElement | null;
  const nodes = Array.from(
    doc.querySelectorAll("[data-el][data-id]"),
  ) as HTMLElement[];

  if (nodes.length === 0 && !pageEl) return null;

  const px = (v: string | null) => Math.round(parseFloat(v || "0")) || 0;

  const page: DesignDoc["page"] = {
    width: pageEl ? px(pageEl.style.width) || 794 : fallbackPage?.width ?? 794,
    height: pageEl
      ? px(pageEl.style.minHeight) || 1123
      : fallbackPage?.height ?? 1123,
    background: pageEl?.style.background || fallbackPage?.background || "#ffffff",
    padding: pageEl ? px(pageEl.style.padding) : (fallbackPage?.padding ?? 48),
  };

  const elements: DesignElement[] = nodes.map((node) => {
    const type = (node.getAttribute("data-el") || "text") as ElementType;
    const style: Record<string, string> = {};

    // Everything except the geometry/stacking is a user style
    const skip = new Set([
      "position",
      "left",
      "top",
      "width",
      "height",
      "z-index",
      "transform",
      "clip-path",
    ]);
    for (let i = 0; i < node.style.length; i++) {
      const prop = node.style.item(i);
      if (skip.has(prop)) continue;
      if (prop === "display" && node.style.display === "none") continue;
      const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      style[camel] = node.style.getPropertyValue(prop);
    }

    const props: DesignElement["props"] = {};
    if (type === "text") props.text = node.innerHTML;
    if (type === "image") props.src = node.getAttribute("src") || "";
    if (type === "qr") props.url = node.getAttribute("data-url") || "";
    if (type === "shape")
      props.shape = (node.getAttribute("data-shape") as any) || "rect";
    if (type === "table") props.columns = node.getAttribute("data-columns") || "";

    return {
      id: node.getAttribute("data-id") || newElementId(),
      type,
      name: node.getAttribute("data-name") || undefined,
      x: px(node.style.left),
      y: px(node.style.top),
      w: px(node.style.width),
      h: px(node.style.height),
      rotation: Number(node.getAttribute("data-rotation")) || 0,
      locked: node.getAttribute("data-locked") === "1",
      hidden: node.getAttribute("data-hidden") === "1",
      props,
      style,
    };
  });

  return { page, elements };
}

/** Extracts a `<style>` block appended by designToHtml, if present. */
export function extractCss(html: string): string {
  const m = html.match(/<style>([\s\S]*?)<\/style>/i);
  return m ? m[1].trim() : "";
}
