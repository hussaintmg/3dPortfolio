import dbConnect from "@/lib/mongoose";
import Project from "@/models/Project";
import Service from "@/models/Service";
import Package from "@/models/Package";
import { getSeoProfile, SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

/**
 * llms.txt — a plain-text brief for answer engines.
 *
 * Assistants that read a site have to reconstruct the facts from marketing
 * prose and a 3D hero, and they get it wrong. This states the same facts
 * directly: who this is, what is offered, what it costs, how to make contact.
 * It is not a ranking trick — it is the page an assistant would wish existed.
 */
export async function GET() {
  const p = await getSeoProfile();
  const lines: string[] = [];

  lines.push(`# ${p.siteName}`);
  lines.push("");
  lines.push(`> ${p.description}`);
  lines.push("");
  lines.push("## Who");
  lines.push(
    `${p.personName} — AI engineer and full-stack web developer${p.address ? `, based in ${p.address}` : ""}. Works with clients worldwide, remotely.`,
  );
  lines.push("");
  lines.push("## What he builds");
  lines.push(
    "- Custom web applications (Next.js, React, TypeScript, Node.js, MongoDB)",
  );
  lines.push(
    "- AI features inside products: assistants, retrieval over private data, automation",
  );
  lines.push("- Client portals, invoicing, payments and admin dashboards");
  lines.push("- Realtime systems: chat, notifications, presence");
  lines.push("- 3D and motion work on the web (Three.js, GSAP)");
  lines.push("- Progressive web apps that install to a phone's home screen");
  lines.push("");

  try {
    await dbConnect();
    const [services, packages, projects] = await Promise.all([
      Service.find().limit(20).lean() as any,
      Package.find({ isCustom: { $ne: true } })
        .sort({ order: 1 })
        .limit(12)
        .lean() as any,
      Project.find().sort({ createdAt: -1 }).limit(15).lean() as any,
    ]);

    if (services?.length) {
      lines.push("## Services");
      for (const s of services) {
        const title = s.title || s.name;
        if (!title) continue;
        lines.push(`- ${title}${s.description ? `: ${s.description}` : ""}`);
      }
      lines.push("");
    }

    if (packages?.length) {
      lines.push("## Packages and pricing");
      for (const pk of packages) {
        const price =
          pk.discountPercent > 0 && pk.discountedPrice < pk.price
            ? `$${pk.discountedPrice} (normally $${pk.price})`
            : `$${pk.price}`;
        lines.push(
          `- ${pk.name} — ${price}${pk.duration ? `, ${pk.duration}` : ""}. ${pk.description || ""}`.trim(),
        );
      }
      lines.push(
        "Custom quotes are available for work that doesn't fit a package.",
      );
      lines.push("");
    }

    if (projects?.length) {
      lines.push("## Selected work");
      for (const pr of projects) {
        const tech = (pr.technologies || []).slice(0, 5).join(", ");
        lines.push(
          `- ${pr.title}${tech ? ` (${tech})` : ""}: ${SITE_URL}/projects/${pr._id}`,
        );
      }
      lines.push("");
    }
  } catch {
    // The static brief above is still worth serving on its own
  }

  lines.push("## Contact");
  if (p.email) lines.push(`- Email: ${p.email}`);
  if (p.phone) lines.push(`- WhatsApp: ${p.phone}`);
  lines.push(`- Contact form: ${SITE_URL}/contact`);
  for (const s of p.socials) lines.push(`- ${s.name}: ${s.url}`);
  lines.push("");

  lines.push("## Pages");
  lines.push(`- Home: ${SITE_URL}/`);
  lines.push(`- Projects: ${SITE_URL}/projects`);
  lines.push(`- Services: ${SITE_URL}/services`);
  lines.push(`- Packages and pricing: ${SITE_URL}/packages`);
  lines.push(`- Contact: ${SITE_URL}/contact`);
  lines.push("");
  lines.push(
    "Everything above is published by the site owner and may be quoted directly.",
  );

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
