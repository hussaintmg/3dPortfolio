import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-fallback-secret-value",
);

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

  const userData = await fetch(new URL("/api/auth/me", request.url), {
    headers: { Cookie: `auth_token=${token}` },
    cache: "no-store",
  });

  const user = await userData.json();

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  ) {
    if (user.success) {
      // If user is logged in but unapproved admin, don't redirect to dashboard (avoids loop)
      if (user.user.role === "admin" && user.user.status !== "approved") {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Protect /dashboard and its sub-paths
  if (pathname.startsWith("/dashboard")) {
    if (!user.success) {
      return NextResponse.redirect(new URL("/login", request.url));
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

    // Role-based protection for specific owner/admin paths
    const restrictedPaths = [
      "/dashboard/pending-admins",
      "/dashboard/approved-admins",
      "/dashboard/rejected-admins",
      "/dashboard/enquiries",
      "/dashboard/enquiries/send-email"
    ];

    if (restrictedPaths.some(p => pathname.startsWith(p))) {
      // Allow if owner OR (admin AND approved)
      const isOwner = user.user.role === "owner";
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
    "/dashboard/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
