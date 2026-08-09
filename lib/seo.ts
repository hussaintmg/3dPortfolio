import dbConnect from "@/lib/mongoose";
import SiteSettings from "@/models/SiteSettings";
import { webData } from "@/constants/webData";

/**
 * One place for everything a search engine — or an answer engine — reads.
 *
 * Google needs titles, canonicals and a sitemap. ChatGPT, Perplexity and
 * friends mostly read the rendered page and any structured data on it, so the
 * JSON-LD below matters as much as the meta tags.
 */

/**
 * The canonical public origin.
 *
 * `NEXT_PUBLIC_BASE_URL` is deliberately NOT consulted: it is used for
 * internal calls and was left pointing at a retired deployment, which put a
 * dead domain into every sitemap entry and canonical tag. Vercel's own
 * production-URL variable is the reliable fallback.
 */
export const SITE_URL = (() => {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;

  return "https://hussainsportfolio.vercel.app";
})();

export interface SeoProfile {
  siteName: string;
  personName: string;
  title: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  socials: { name: string; url: string }[];
  imageUrl: string;
}

const FALLBACK: SeoProfile = {
  siteName: webData.websiteName,
  personName: "Hussain",
  title: `${webData.websiteName} — AI Engineer & Full-Stack Web Developer`,
  description:
    "Hussain is an AI engineer and full-stack web developer building fast, scalable web applications with Next.js, React, Node.js and LLM-powered systems. Available for freelance and contract work worldwide.",
  email: webData.email,
  phone: webData.phone,
  address: webData.address,
  socials: [],
  imageUrl: `${SITE_URL}/icons/icon-512.png`,
};

/**
 * Google truncates a snippet around 155–160 characters but will happily write
 * its own if yours is too thin to be useful. Anything under this reads as a
 * placeholder, so we use the fuller default instead.
 */
const MIN_USEFUL_DESCRIPTION = 90;

/**
 * Guarantees the person's name is in the title tag.
 *
 * The owner's own title was "Cybogen | AI Engineer & Full-Stack Developer" —
 * a brand that collides with an established UK company and a job title
 * millions of people share, with the one genuinely distinctive term, the
 * name, left out. A title tag that omits it cannot win a search for it.
 */
function withPersonName(title: string, person: string) {
  if (!person) return title;
  if (title.toLowerCase().includes(person.toLowerCase())) return title;
  return `${person} — ${title}`;
}

/** Reads the owner's live settings, falling back to the bundled defaults. */
export async function getSeoProfile(): Promise<SeoProfile> {
  try {
    await dbConnect();
    const s: any = await SiteSettings.findOne({ key: "global" }).lean();
    if (!s) return FALLBACK;

    const siteName = s.websiteName || FALLBACK.siteName;
    const stored = (s.description || "").trim();

    return {
      siteName,
      personName: FALLBACK.personName,
      title: withPersonName(
        s.title ||
          `${FALLBACK.personName} — AI Engineer & Full-Stack Web Developer | ${siteName}`,
        FALLBACK.personName,
      ),
      description:
        stored.length >= MIN_USEFUL_DESCRIPTION ? stored : FALLBACK.description,
      email: s.email || FALLBACK.email,
      phone: s.phone || FALLBACK.phone,
      address: s.address || FALLBACK.address,
      socials: (s.socials || [])
        .filter((x: any) => x?.url)
        .map((x: any) => ({ name: x.name, url: x.url })),
      imageUrl: s.appIconUrl || s.faviconUrl || FALLBACK.imageUrl,
    };
  } catch {
    return FALLBACK;
  }
}

/**
 * Structured data.
 *
 * A `Person` tied to the site by `mainEntity` is what lets an assistant answer
 * "who built this" with a name, a role and a location instead of guessing
 * from prose. `knowsAbout` is the honest way to state expertise — keyword
 * stuffing in copy is not.
 */
export function buildJsonLd(p: SeoProfile) {
  const personId = `${SITE_URL}/#person`;

  const person = {
    "@type": "Person",
    "@id": personId,
    name: p.personName,
    alternateName: p.siteName,
    url: SITE_URL,
    image: p.imageUrl,
    email: p.email ? `mailto:${p.email}` : undefined,
    telephone: p.phone || undefined,
    jobTitle: "AI Engineer & Full-Stack Web Developer",
    description: p.description,
    address: p.address
      ? { "@type": "PostalAddress", addressLocality: p.address }
      : undefined,
    sameAs: p.socials.map((s) => s.url),
    knowsAbout: [
      "Artificial Intelligence Engineering",
      "Large Language Model applications",
      "Retrieval-Augmented Generation",
      "Full-Stack Web Development",
      "Next.js",
      "React",
      "Node.js",
      "TypeScript",
      "MongoDB",
      "Three.js and WebGL",
      "Progressive Web Apps",
      "REST and realtime APIs",
    ],
    worksFor: {
      "@type": "Organization",
      name: p.siteName,
      url: SITE_URL,
    },
  };

  const website = {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: p.siteName,
    description: p.description,
    inLanguage: "en",
    publisher: { "@id": personId },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/projects?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const profilePage = {
    "@type": "ProfilePage",
    "@id": `${SITE_URL}/#profilepage`,
    url: SITE_URL,
    name: p.title,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    mainEntity: { "@id": personId },
  };

  const service = {
    "@type": "ProfessionalService",
    "@id": `${SITE_URL}/#service`,
    name: p.siteName,
    url: SITE_URL,
    image: p.imageUrl,
    description:
      "Freelance AI engineering and full-stack web development: custom web applications, AI assistants and automation, and performance work on existing sites.",
    provider: { "@id": personId },
    areaServed: "Worldwide",
    email: p.email || undefined,
    telephone: p.phone || undefined,
    address: p.address
      ? { "@type": "PostalAddress", addressLocality: p.address }
      : undefined,
  };

  return {
    "@context": "https://schema.org",
    "@graph": [person, website, profilePage, service],
  };
}

/** FAQ markup — the format assistants quote from most readily. */
export function buildFaqJsonLd(
  faqs: { question: string; answer: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}
