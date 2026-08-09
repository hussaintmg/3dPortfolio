import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

/** Google's HTML-file ownership proof, e.g. /googleab12cd34ef56.html */
const GOOGLE_VERIFY_FILE = /^\/(google[A-Za-z0-9_-]+\.html)$/;

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

  /*
   * Search Console picks a different filename for every property, so it can
   * never be a static route. The handler that knows which name the owner
   * saved answers it, and this runs before anything else, because
   * maintenance mode redirecting the proof to /login is exactly how
   * verification fails.
   *
   * Fetched and returned rather than rewritten: a rewrite from a path that
   * ends in `.html` resolves to the 404 page instead of the route handler,
   * even though the handler itself answers 200 when called directly.
   */
  const googleFile = pathname.match(GOOGLE_VERIFY_FILE);
  if (googleFile) {
    const url = new URL("/api/seo/google-verify", request.url);
    url.searchParams.set("file", googleFile[1]);
    try {
      const res = await fetch(url, { cache: "no-store" });
      return new NextResponse(await res.text(), {
        status: res.status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
    } catch {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  let user = { success: false, user: null as any };

  try {
    const userData = await fetch(new URL("/api/auth/me", request.url), {
      headers: { Cookie: `auth_token=${token}` },
      cache: "no-store",
    });

    if (userData.ok && userData.headers.get("content-type")?.includes("application/json")) {
      user = await userData.json();
    }
  } catch (error) {
    console.error("Auth verification failed in proxy middleware:", error);
  }

  const isOwner = user.success && user.user?.role === "owner";
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  /** Read maintenance mode once, only when a decision depends on it. */
  let maintenanceMode = false;
  if (!isOwner || isAuthPage) {
    try {
      const statusRes = await fetch(new URL("/api/site-status", request.url), {
        cache: "no-store",
      });
      if (statusRes.ok) {
        maintenanceMode = !!(await statusRes.json()).maintenanceMode;
      }
    } catch {
      // A status lookup failure must never take the site down
    }
  }

  // ── Maintenance mode ──────────────────────────────────────────────────────
  // When ON, only the owner may browse. Auth pages stay open for everyone so
  // the owner (and returning clients) can still sign in.
  if (!isOwner && !isAuthPage && maintenanceMode) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("maintenance", "1");
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage) {
    /*
     * While maintenance mode is on, auth pages are always rendered:
     *  - the owner needs them to open the on-page editor
     *  - everyone else would otherwise ping-pong between /login and the
     *    portal they are not allowed to see (an infinite redirect)
     */
    if (maintenanceMode) {
      return NextResponse.next();
    }
    if (user.success) {
      // If user is logged in but unapproved admin, don't redirect to dashboard (avoids loop)
      if (user.user.role === "admin" && user.user.status !== "approved") {
        return NextResponse.next();
      }
      // Clients belong in their portal, staff in the dashboard
      const target = user.user.role === "user" ? "/portal" : "/dashboard";
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.next();
  }

  // ── Client portal: any signed-in user ────────────────────────────────────
  if (pathname.startsWith("/portal")) {
    if (!user.success) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Protect /dashboard and its sub-paths
  if (pathname.startsWith("/dashboard")) {
    if (!user.success) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Plain clients never see the staff dashboard
    if (user.user.role === "user") {
      return NextResponse.redirect(new URL("/portal", request.url));
    }

    // Status-based protection for admins - MUST check this BEFORE role-based subpaths
    if (user.user.role === "admin" && user.user.status !== "approved") {
      const message = user.user.status === "pending"
        ? "Your account is awaiting owner approval."
        : "Your administrative access has been suspended or rejected.";

      const homeUrl = new URL("/", request.url);
      homeUrl.searchParams.set("error", message);
      return NextResponse.redirect(homeUrl);
    }

    const OwnerPaths = [
      "/dashboard/pending-admins",
      "/dashboard/approved-admins",
      "/dashboard/rejected-admins",
      "/dashboard/setting",
      "/dashboard/templates",
      "/dashboard/variables",
      "/dashboard/payments",
    ];

    if (OwnerPaths.some(p => pathname.startsWith(p))) {
      if (user.user.role !== "owner") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    // Role-based protection for specific owner/admin paths
    const OwnerAdminPaths = [
      "/dashboard/enquiries",
      "/dashboard/enquiries/send-email"
    ];

    if (OwnerAdminPaths.some(p => pathname.startsWith(p))) {
      // Allow if owner OR (admin AND approved)
      const isApprovedAdmin = user.user.role === "admin" && user.user.status === "approved";

      if (!isOwner && !isApprovedAdmin) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }
  return NextResponse.next();
}

export { proxy as proxyMiddleware };
export default proxy;

export const config = {
  matcher: [
    /*
     * Every page route (so maintenance mode can gate the whole site), minus
     * API handlers, Next internals and static assets.
     *
     * The crawler and site-verification files are excluded too. They were
     * being caught by maintenance mode and answered with a redirect to
     * /login, which reads to Google and Bing as "no robots.txt, no sitemap,
     * verification failed" — the one thing maintenance mode should never do
     * is quietly de-index the site.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|hdr/|robots\\.txt|sitemap\\.xml|llms\\.txt|indexnow-key\\.txt|BingSiteAuth\\.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|hdr|mp4|webm|woff|woff2)$).*)",
  ],
};
