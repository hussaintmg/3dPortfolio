import type { MetadataRoute } from "next";
import dbConnect from "@/lib/mongoose";
import Project from "@/models/Project";
import Package from "@/models/Package";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

/**
 * There was no sitemap either, so nothing pointed a crawler at the project
 * and package pages — they were only reachable by following links from the
 * home page, which is slower to index and easier to miss.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/projects`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/services`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/packages`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  try {
    await dbConnect();
    const [projects, packages] = await Promise.all([
      Project.find().select("_id updatedAt createdAt").limit(500).lean(),
      Package.find({ isCustom: { $ne: true } })
        .select("_id updatedAt createdAt")
        .limit(200)
        .lean(),
    ]);

    return [
      ...staticPages,
      ...(projects as any[]).map((p) => ({
        url: `${SITE_URL}/projects/${p._id}`,
        lastModified: p.updatedAt || p.createdAt || now,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
      // Custom packages belong to one client and must never be listed
      ...(packages as any[]).map((p) => ({
        url: `${SITE_URL}/packages/${p._id}`,
        lastModified: p.updatedAt || p.createdAt || now,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    // A database blip must not take the sitemap down with it
    return staticPages;
  }
}
