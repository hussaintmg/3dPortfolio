import type { Metadata } from "next";

/**
 * Page-level metadata. The page itself is a client component, so its title
 * and description have to live in a layout — without this every page shared
 * the home page's title, which is one of the cheapest ways to lose a ranking.
 */
export const metadata: Metadata = {
  title: "Services — AI engineering and full-stack web development",
  description:
    "What Hussain builds for clients: custom web applications, AI assistants and automation, client portals, realtime systems and performance work on existing sites.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Services — AI engineering and full-stack web development",
    description:
      "What Hussain builds for clients: custom web applications, AI assistants and automation, client portals, realtime systems and performance work on existing sites.",
    url: "/services",
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
