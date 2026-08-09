/**
 * Fonts the style panel offers, and the rule for loading anything else.
 *
 * The site ships Inter, Poppins and Space Grotesk through `next/font`, so
 * those are free — they are already in the page. Everything else the owner
 * types is treated as a Google Fonts family and fetched on demand; offering a
 * font picker that silently falls back to the default because the font was
 * never downloaded is worse than not offering one.
 */

export interface FontOption {
  label: string;
  /** The CSS `font-family` value. */
  value: string;
  /** True when the page already has it — nothing to download. */
  bundled?: boolean;
}

/** Always available: bundled by next/font, or present on every OS. */
export const FONT_PRESETS: FontOption[] = [
  { label: "Theme default", value: "", bundled: true },
  { label: "Inter (body)", value: "var(--font-inter), system-ui, sans-serif", bundled: true },
  { label: "Poppins (headings)", value: "var(--font-poppins), system-ui, sans-serif", bundled: true },
  { label: "System UI", value: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", bundled: true },
  { label: "Georgia (serif)", value: "Georgia, 'Times New Roman', serif", bundled: true },
  { label: "Courier (mono)", value: "'Courier New', ui-monospace, monospace", bundled: true },
];

/** Popular Google families, offered as one-tap picks. Fetched when used. */
export const GOOGLE_FONTS = [
  "Space Grotesk",
  "Playfair Display",
  "Montserrat",
  "Bebas Neue",
  "Lora",
  "Oswald",
  "Raleway",
  "DM Sans",
  "Outfit",
  "Sora",
  "Manrope",
  "Cormorant Garamond",
] as const;

/**
 * Pulls the family name out of a stored `font-family` value.
 *
 * Returns null for anything that does not need downloading — a CSS variable,
 * or a stack made only of fonts every device already has.
 */
export function googleFamilyOf(value?: string): string | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  // A bundled preset: var(--font-…) or a generic/system stack
  if (raw.startsWith("var(")) return null;

  const first = raw.split(",")[0].trim().replace(/^["']|["']$/g, "");
  if (!first) return null;

  const alwaysPresent = [
    "system-ui",
    "-apple-system",
    "segoe ui",
    "roboto",
    "arial",
    "helvetica",
    "georgia",
    "times new roman",
    "courier new",
    "ui-monospace",
    "monospace",
    "sans-serif",
    "serif",
    "cursive",
  ];
  if (alwaysPresent.includes(first.toLowerCase())) return null;

  // Google's API only accepts letters, digits and spaces in a family name
  return /^[A-Za-z0-9 ]{2,40}$/.test(first) ? first : null;
}

/** The stylesheet URL for a set of families, or null when there are none. */
export function googleFontsHref(families: string[]): string | null {
  const unique = Array.from(new Set(families.filter(Boolean))).sort();
  if (unique.length === 0) return null;
  const params = unique
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@300;400;500;600;700;800;900`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/** What to store when the owner picks a Google family. */
export const googleFontStack = (family: string) =>
  `'${family}', system-ui, sans-serif`;
