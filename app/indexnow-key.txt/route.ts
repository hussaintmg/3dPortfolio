import { INDEXNOW_KEY } from "@/lib/indexnow";

/**
 * The IndexNow key file.
 *
 * Its only job is to prove that whoever submits URLs for this host also
 * controls the host. Serving it from a route rather than `public/` means the
 * key can be swapped through an environment variable without moving a file.
 */
export const dynamic = "force-static";

export function GET() {
  return new Response(INDEXNOW_KEY, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
