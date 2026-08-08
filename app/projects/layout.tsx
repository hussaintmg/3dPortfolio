import type { Metadata } from "next";

/**
 * Page-level metadata. The page itself is a client component, so its title
 * and description have to live in a layout — without this every page shared
 * the home page's title, which is one of the cheapest ways to lose a ranking.
 */
export const metadata: Metadata = {
  title: "Projects — web apps, AI systems and 3D interfaces",
  description:
    "Selected work by Hussain: production web applications, AI-powered features and interactive 3D interfaces, built with Next.js, React, Node.js and TypeScript.",
  alternates: { canonical: "/projects" },
  openGraph: {
    title: "Projects — web apps, AI systems and 3D interfaces",
    description:
      "Selected work by Hussain: production web applications, AI-powered features and interactive 3D interfaces, built with Next.js, React, Node.js and TypeScript.",
    url: "/projects",
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
