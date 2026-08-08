/**
 * Stable CSS selectors for arbitrary page elements.
 *
 * The visual editor can only remember what the owner clicked if we can name
 * it the same way on the next page load. Ids and our own editable keys are
 * the most durable anchors; otherwise we walk up building tag + nth-of-type
 * steps, which survives re-renders as long as the markup shape is unchanged.
 */

/** Elements that belong to the editor itself and must never be selectable. */
export const isEditorChrome = (el: Element | null) =>
  !!el?.closest("[data-edit-bar], [data-editor-ui]");

const nthOfType = (el: Element) => {
  const parent = el.parentElement;
  if (!parent) return 1;
  let index = 1;
  for (const sibling of Array.from(parent.children)) {
    if (sibling === el) break;
    if (sibling.tagName === el.tagName) index += 1;
  }
  return index;
};

/**
 * Builds a selector for `el`, stopping at the closest durable anchor
 * (an id, or an element already carrying an editable key).
 */
export function getElementPath(el: Element): string | null {
  if (!el || el === document.body || isEditorChrome(el)) return null;

  const steps: string[] = [];
  let node: Element | null = el;

  while (node && node !== document.body && steps.length < 12) {
    // An editable key is the strongest anchor we have
    const key = node.getAttribute?.("data-editable-key");
    if (key) {
      steps.unshift(`[data-editable-key="${CSS.escape(key)}"]`);
      return steps.join(" > ");
    }

    if (node.id && !/^«|^radix|^headless/.test(node.id)) {
      steps.unshift(`#${CSS.escape(node.id)}`);
      return steps.join(" > ");
    }

    const tag = node.tagName.toLowerCase();
    steps.unshift(`${tag}:nth-of-type(${nthOfType(node)})`);
    node = node.parentElement;
  }

  return steps.length ? `body ${steps.join(" > ")}` : null;
}

/** Storage key for a picked element. */
export const pathKey = (path: string) => `sel:${path}`;

/** A short, human-readable name for the panel header. */
export function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const text = (el.textContent || "").replace(/\s+/g, " ").trim();

  const names: Record<string, string> = {
    a: "Link",
    button: "Button",
    img: "Image",
    svg: "Icon",
    h1: "Heading",
    h2: "Heading",
    h3: "Heading",
    h4: "Heading",
    p: "Text",
    span: "Text",
    li: "List item",
    section: "Section",
    nav: "Navigation",
    header: "Header",
    footer: "Footer",
    aside: "Sidebar",
    input: "Input",
    table: "Table",
  };

  const base = names[tag] || tag;
  if (text && text.length <= 28) return `${base} · ${text}`;
  if (text) return `${base} · ${text.slice(0, 26)}…`;
  return base;
}

/** camelCase → kebab-case for writing a real stylesheet. */
export const cssText = (styles: Record<string, string>) =>
  Object.entries(styles || {})
    .filter(([, v]) => v !== "" && v != null)
    .map(
      ([k, v]) =>
        `${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}:${v} !important`,
    )
    .join(";");
