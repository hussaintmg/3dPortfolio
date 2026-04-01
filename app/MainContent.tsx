"use client";

import { usePathname } from "next/navigation";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";
import { useNotify } from "@/hooks/useNotify";
import Scene3D from "../Components/3D/Scene3D";

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const isDashboard = pathname.startsWith("/dashboard");
  const isHome = pathname === "/";
  
  // Register the global notify system
  useNotify();

  const isAuth = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password");
  const isDashboardPage = pathname.startsWith("/dashboard");
  const showNavAndFooter = !isDashboardPage && !isAuth;

  return (
    <>
      {showNavAndFooter && <Navbar />}
      <main className="flex-1 overflow-x-hidden relative">
        {children}
      </main>
      {showNavAndFooter && <Footer />}
    </>
  );
}
