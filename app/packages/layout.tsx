import type { Metadata } from "next";

/**
 * Page-level metadata. The page itself is a client component, so its title
 * and description have to live in a layout — without this every page shared
 * the home page's title, which is one of the cheapest ways to lose a ranking.
 */
export const metadata: Metadata = {
  title: "Pricing and packages for web development",
  description:
    "Clear pricing for web development and AI work — fixed packages, ready-made solutions you can buy as-is, and custom quotes for anything that does not fit a box.",
  alternates: { canonical: "/packages" },
  openGraph: {
    title: "Pricing and packages for web development",
    description:
      "Clear pricing for web development and AI work — fixed packages, ready-made solutions you can buy as-is, and custom quotes for anything that does not fit a box.",
    url: "/packages",
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
