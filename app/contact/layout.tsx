import type { Metadata } from "next";

/**
 * Page-level metadata. The page itself is a client component, so its title
 * and description have to live in a layout — without this every page shared
 * the home page's title, which is one of the cheapest ways to lose a ranking.
 */
export const metadata: Metadata = {
  title: "Contact — start a project",
  description:
    "Get in touch with Hussain about a web application, an AI feature or a rebuild. Email, WhatsApp or the contact form; replies usually the same day.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact — start a project",
    description:
      "Get in touch with Hussain about a web application, an AI feature or a rebuild. Email, WhatsApp or the contact form; replies usually the same day.",
    url: "/contact",
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
