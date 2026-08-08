"use client";

import { usePathname } from "next/navigation";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";
import EditModeBar from "../Components/editable/EditModeBar";
import LiveNotifications from "../Components/notifications/LiveNotifications";
import { useNotify } from "@/hooks/useNotify";
/**
 * Imported eagerly (it is light — three.js sits behind its own dynamic
 * boundary) so the placeholder orb paints on the first frame, during the
 * home page's loading skeleton.
 */
import Scene3DBackground from "../Components/3D/Scene3DBackground";

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const isDashboard = pathname.startsWith("/dashboard");
  const isHome = pathname === "/";
  
  // Register the global notify system
  useNotify();

  const isAuth = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password");
  const isDashboardPage = pathname.startsWith("/dashboard");
  const isPortal = pathname.startsWith("/portal");
  const showNavAndFooter = !isDashboardPage && !isAuth && !isPortal;

  return (
    <>
      {isHome && <Scene3DBackground />}
      {showNavAndFooter && <Navbar />}
      <main className="flex-1 overflow-x-hidden relative">
        {children}
      </main>
      {showNavAndFooter && <Footer />}
      {/* Owner-only floating "Edit Page" control (self-hides elsewhere) */}
      <EditModeBar />
      {/* Realtime notification cards for signed-in users */}
      <LiveNotifications />
    </>
  );
}
