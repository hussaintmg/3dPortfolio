import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * There was no robots.txt at all — the host answered 404, which tells a
 * crawler nothing and leaves no pointer to the sitemap.
 *
 * The dashboard, portal and API are disallowed: they are signed-in surfaces
 * with no public value, and crawl budget spent there is crawl budget not
 * spent on the pages meant to rank. AI crawlers are allowed on purpose —
 * being quotable in an assistant's answer is the point.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/dashboard",
    "/dashboard/",
    "/portal",
    "/portal/",
    "/api/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/offline",
  ];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      // Named explicitly so a future blanket block never catches them
      { userAgent: "GPTBot", allow: "/", disallow },
      { userAgent: "OAI-SearchBot", allow: "/", disallow },
      { userAgent: "ChatGPT-User", allow: "/", disallow },
      { userAgent: "PerplexityBot", allow: "/", disallow },
      { userAgent: "ClaudeBot", allow: "/", disallow },
      { userAgent: "Google-Extended", allow: "/", disallow },
      { userAgent: "Applebot-Extended", allow: "/", disallow },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
