import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { webData } from "../constants/webData";
import { AuthProvider } from "../context/AuthContext";
import { OwnerProvider } from "../context/OwnerContext";
import { NotificationProvider } from "../context/NotificationProvider";
import { ToastProvider } from "../Components/toast/ToastProvider";
import { ToastContainer } from "../Components/toast";
import MainContent from "./MainContent";
import LenisProvider from "@/Components/LenisProvider";
import BackgroundOrbs from "@/Components/BackgroundOrbs";
import ProgressBar from "@/Components/ProgressBar";
import { ReadymadeSolutionsProvider } from "@/context/ReadymadeSolutionsContext";
import { SiteProvider } from "@/context/SiteContext";
import dbConnect from "@/lib/mongoose";
import SiteSettings from "@/models/SiteSettings";
import SiteContent from "@/models/SiteContent";
import SiteStyle from "@/models/SiteStyle";
import SiteLink from "@/models/SiteLink";
import SiteAnimation from "@/models/SiteAnimation";
import { verifyToken } from "@/lib/auth";
import { getSeoProfile, buildJsonLd, SITE_URL } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
});

/**
 * Mongoose documents carry ObjectIds/Dates that a Client Component cannot
 * receive. A JSON round-trip flattens them to plain strings.
 */
function toPlain<T>(value: T): T {
  return value == null ? value : (JSON.parse(JSON.stringify(value)) as T);
}

/**
 * Site data is read per request so an owner's saved text/style edits are
 * already in the HTML — no client fetch, no flash of the old copy.
 */
async function getSiteData() {
  try {
    await dbConnect();
    const [settings, contentDocs, styleDocs, linkDocs, animDocs] =
      await Promise.all([
        SiteSettings.findOne({ key: "global" }).lean(),
        SiteContent.find().lean(),
        SiteStyle.find().lean(),
        SiteLink.find().lean(),
        SiteAnimation.find().lean(),
      ]);

    const content: Record<string, string> = {};
    for (const d of contentDocs as any[]) content[d.key] = d.value;

    const styles: Record<string, any> = {};
    for (const d of styleDocs as any[]) styles[d.key] = toPlain(d.styles || {});

    const links: Record<string, any> = {};
    for (const d of linkDocs as any[]) {
      links[d.key] = {
        href: d.href || "",
        newTab: !!d.newTab,
        enabled: d.enabled !== false,
      };
    }

    const animations: Record<string, any> = {};
    for (const d of animDocs as any[]) {
      animations[d.key] = {
        type: d.type,
        duration: d.duration,
        delay: d.delay,
        easing: d.easing,
        once: d.once !== false,
      };
    }

    return {
      settings: toPlain(settings) as any,
      content,
      styles,
      links,
      animations,
    };
  } catch {
    return {
      settings: null,
      content: {},
      styles: {},
      links: {},
      animations: {},
    };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const p = await getSeoProfile();
  const s: any = await SiteSettings.findOne({ key: "global" })
    .lean()
    .catch(() => null);

  return {
    // Without this, Next emits relative og:image/canonical URLs, which most
    // crawlers and every social scraper ignore.
    metadataBase: new URL(SITE_URL),
    title: {
      default: p.title,
      // Sub-pages set their own title and inherit the brand suffix
      template: `%s · ${p.siteName}`,
    },
    description: p.description,
    applicationName: p.siteName,
    authors: [{ name: p.personName, url: SITE_URL }],
    creator: p.personName,
    publisher: p.personName,
    keywords: [
      "AI engineer",
      "full-stack web developer",
      "Next.js developer",
      "React developer",
      "freelance web developer",
      "LLM application developer",
      "web developer Pakistan",
      p.siteName,
      `${p.personName} portfolio`,
    ],
    alternates: { canonical: "/" },
    openGraph: {
      type: "profile",
      url: SITE_URL,
      siteName: p.siteName,
      title: p.title,
      description: p.description,
      images: [{ url: p.imageUrl, width: 512, height: 512, alt: p.siteName }],
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: p.title,
      description: p.description,
      images: [p.imageUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    ...(s?.faviconUrl
      ? { icons: { icon: s.faviconUrl, shortcut: s.faviconUrl } }
      : {}),
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
      : {}),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ settings, content, styles, links, animations }, cookieStore, seo] =
    await Promise.all([getSiteData(), cookies(), getSeoProfile()]);
  const jsonLd = buildJsonLd(seo);

  // Editing controls are owner-only, so resolve the role on the server
  let isOwner = false;
  const token = cookieStore.get("auth_token")?.value;
  if (token) {
    const user: any = await verifyToken(token);
    isOwner = user?.role === "owner";
  }

  // Only primitives and plain arrays cross into the client provider
  const initialSettings = settings
    ? {
        websiteName: settings.websiteName || undefined,
        title: settings.title || undefined,
        description: settings.description || undefined,
        faviconUrl: settings.faviconUrl || "",
        email: settings.email || undefined,
        phone: settings.phone || undefined,
        address: settings.address || undefined,
        socials: settings.socials?.length
          ? settings.socials.map((s: any) => ({
              name: s.name || "",
              url: s.url || "",
              icon: s.icon || "Github",
            }))
          : undefined,
        footerLinks: (settings.footerLinks || []).map((l: any) => ({
          name: l.name || "",
          url: l.url || "",
        })),
        maintenanceMode: !!settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage || "",
      }
    : null;

  return (
    <html lang="en" className="scroll-smooth custom-scrollbar">
      <head>
        {/* Start the 3D environment download in parallel with everything else
            so the sphere's reflections are ready almost immediately. */}
        <link
          rel="preload"
          href="/hdr/dikhololo_night_1k.hdr"
          as="fetch"
          crossOrigin="anonymous"
        />
        {/* Installing the app is what makes notifications carry OUR branding */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="canonical" href={SITE_URL} />
        {/*
          Structured data. Search engines use it for rich results; answer
          engines use it to state who this is without inferring it from prose,
          which is the difference between being quoted and being skipped.
        */}
        <script
          type="application/ld+json"
          // The payload is built from our own settings, never user input
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${inter.variable} ${poppins.variable} font-sans bg-background text-foreground antialiased min-h-screen flex flex-col`}
      >
        <LenisProvider>
          <ProgressBar />
          <BackgroundOrbs />
          <NotificationProvider>
            <ReadymadeSolutionsProvider>
              <AuthProvider>
                <OwnerProvider>
                  <SiteProvider
                    initialSettings={initialSettings as any}
                    initialContent={content}
                    initialStyles={styles}
                    initialLinks={links}
                    initialAnimations={animations}
                    isOwner={isOwner}
                  >
                    <ToastProvider>
                      <MainContent>{children}</MainContent>
                      <ToastContainer />
                    </ToastProvider>
                  </SiteProvider>
                </OwnerProvider>
              </AuthProvider>
            </ReadymadeSolutionsProvider>
          </NotificationProvider>
        </LenisProvider>
      </body>
    </html>
  );
}
