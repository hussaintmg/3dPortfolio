/**
 * Library of drop-in sections the owner can add to any public page.
 * `fields` lists the editable text keys each template renders, so the editor
 * can seed sensible defaults when a section is created.
 */
export interface SectionTemplate {
  id: string;
  label: string;
  description: string;
  /** Emoji used in the picker — keeps the library dependency-free. */
  glyph: string;
  defaults: Record<string, string>;
  /** Non-text data (image urls, layout switches). */
  content?: Record<string, any>;
}

export const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    id: "heading",
    label: "Section Heading",
    description: "Eyebrow, big title and a supporting line.",
    glyph: "🅷",
    defaults: {
      eyebrow: "Section",
      title: "A headline that sets the scene",
      subtitle:
        "One or two sentences that explain what this part of the page is about.",
    },
  },
  {
    id: "text",
    label: "Text Block",
    description: "A single column of prose.",
    glyph: "¶",
    defaults: {
      title: "About this",
      body: "Write anything here — the whole block is editable in place, and you can restyle every line from the panel.",
    },
  },
  {
    id: "features",
    label: "Feature Grid",
    description: "Three cards with title and copy.",
    glyph: "▦",
    defaults: {
      eyebrow: "What you get",
      title: "Built to do the job",
      f1t: "Fast by default",
      f1b: "Performance budgets baked in from the first commit.",
      f2t: "Designed properly",
      f2b: "Interfaces that feel considered, not assembled.",
      f3t: "Yours to run",
      f3b: "Clean handover with docs and no vendor lock-in.",
    },
  },
  {
    id: "imageText",
    label: "Image + Text",
    description: "Picture on one side, copy on the other.",
    glyph: "◧",
    defaults: {
      eyebrow: "Case in point",
      title: "Show the work",
      body: "Pair a screenshot with the story behind it. Flip the image side from the section controls.",
      cta: "Learn more",
    },
    content: { imageUrl: "", flip: false },
  },
  {
    id: "stats",
    label: "Stats Row",
    description: "Three or four headline numbers.",
    glyph: "﹟",
    defaults: {
      s1v: "50+",
      s1l: "Projects shipped",
      s2v: "6 yrs",
      s2l: "Building for the web",
      s3v: "100%",
      s3l: "On-time delivery",
      s4v: "24h",
      s4l: "Typical reply time",
    },
  },
  {
    id: "cta",
    label: "Call To Action",
    description: "Big line plus a button.",
    glyph: "➤",
    defaults: {
      title: "Ready when you are",
      body: "Tell me what you're building and I'll tell you how I can help.",
      button: "Start a conversation",
    },
  },
  {
    id: "faq",
    label: "FAQ",
    description: "Four expandable question/answer pairs.",
    glyph: "?",
    defaults: {
      title: "Questions, answered",
      q1: "How long does a project take?",
      a1: "Most builds land between three and eight weeks depending on scope.",
      q2: "How do payments work?",
      a2: "A deposit to start, the balance on delivery. Invoices arrive in your portal.",
      q3: "Do you work with existing code?",
      a3: "Yes — audits, rescues and incremental rewrites are all fine.",
      q4: "What happens after launch?",
      a4: "You get the code, the docs and a support window to settle everything in.",
    },
  },
  {
    id: "gallery",
    label: "Image Gallery",
    description: "A responsive grid of images.",
    glyph: "▤",
    defaults: { title: "Gallery" },
    content: { images: [] as string[] },
  },
  {
    id: "contact",
    label: "Contact Form",
    description: "Working enquiry form — submits straight to your inbox.",
    glyph: "✉",
    defaults: {
      eyebrow: "Get in touch",
      title: "Tell me about your project",
      subtitle: "I read every message and usually reply the same day.",
      button: "Send message",
      nameLabel: "Your name",
      emailLabel: "Email address",
      messageLabel: "What are you building?",
      success: "Thanks — your message is in. I'll be in touch shortly.",
    },
  },
  {
    id: "spacer",
    label: "Divider / Spacer",
    description: "Breathing room, with an optional line.",
    glyph: "—",
    defaults: {},
    content: { height: 96, line: true },
  },
];

export const getTemplate = (id: string) =>
  SECTION_TEMPLATES.find((t) => t.id === id);

/** Pages that accept custom sections. */
export const SECTION_PAGES = [
  "home",
  "projects",
  "services",
  "packages",
  "contact",
] as const;
