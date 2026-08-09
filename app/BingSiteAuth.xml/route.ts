/**
 * Bing Webmaster Tools site verification, XML-file method.
 *
 * Bing offers three ways to prove ownership: this file, a meta tag, or a DNS
 * record. The meta tag is wired up in `app/layout.tsx` from the same variable
 * — both are served so whichever option the verification screen defaults to
 * just works, and neither exists until the code is set.
 */
export const dynamic = "force-static";

export function GET() {
  const code = process.env.BING_SITE_VERIFICATION?.trim();

  if (!code) {
    return new Response("Not found", { status: 404 });
  }

  const xml = `<?xml version="1.0"?>\n<users>\n  <user>${code}</user>\n</users>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
