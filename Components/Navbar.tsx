"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { homeLinks } from "../constants/navigation";
import { webData } from "../constants/webData";
import { useAuth } from "../context/AuthContext";
import { gsap } from "gsap";

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname() || "";
  const navRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileOverlayRef = useRef<HTMLDivElement>(null);

  const lastScrollY = useRef(0);

  useEffect(() => {
    let isVisible = true;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrolled(currentScrollY > 20);

      if (navRef.current) {
        if (
          currentScrollY > lastScrollY.current &&
          currentScrollY > 100 &&
          isVisible
        ) {
          gsap.to(navRef.current, {
            y: "-100%",
            duration: 0.3,
            ease: "power2.inOut",
          });
          isVisible = false;
        } else if (currentScrollY < lastScrollY.current && !isVisible) {
          gsap.to(navRef.current, {
            y: "0%",
            duration: 0.3,
            ease: "power2.out",
          });
          isVisible = true;
        }
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    gsap.fromTo(
      navRef.current,
      { y: "-100%", opacity: 0 },
      { y: "0%", opacity: 1, duration: 1, ease: "power3.out", delay: 0.2 },
    );

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isOpen) {
      gsap.to(mobileOverlayRef.current, {
        opacity: 1,
        duration: 0.3,
        display: "block",
        ease: "power2.out",
      });
      gsap.fromTo(
        mobileMenuRef.current,
        { x: "-100%" },
        { x: "0%", duration: 0.4, ease: "power3.out", display: "flex" },
      );
    } else {
      gsap.to(mobileOverlayRef.current, {
        opacity: 0,
        duration: 0.3,
        display: "none",
        ease: "power2.in",
      });
      gsap.to(mobileMenuRef.current, {
        x: "-100%",
        duration: 0.4,
        ease: "power3.in",
        onComplete: () => {
          if (mobileMenuRef.current)
            gsap.set(mobileMenuRef.current, { display: "none" });
        },
      });
    }
  }, [isOpen]);

  if (pathname.startsWith("/dashboard")) return null;

  return (
    <>
      <header
        ref={navRef}
        className={`fixed top-0 w-full z-50 transition-colors duration-500 ${
          scrolled
            ? "bg-background/90 backdrop-blur-xl border-b border-white/5 py-4 shadow-xl"
            : "bg-transparent py-6"
        }`}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-5 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="md:hidden">
              <button
                onClick={() => setIsOpen(true)}
                className="text-white cursor-pointer p-2 hover:bg-white/10 rounded-xl transition-colors border border-transparent hover:border-white/10"
              >
                <Menu size={24} />
              </button>
            </div>
            <Link href="/">
              <div className="text-xl font-black tracking-tighter text-white hover:text-[#6366F1] transition-colors uppercase">
                {webData.websiteName}
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex gap-5 items-center">
            {homeLinks.map((link) => (
              <Link
                key={link.name}
                href={link.url}
                className={`text-xs uppercase tracking-widest font-black transition-all hover:text-accent ${pathname === link.url ? "text-accent" : "text-gray-400"}`}
              >
                {link.name}
              </Link>
            ))}

            <div className="flex items-center gap-6 border-l border-white/10 pl-8">
              {loading ? (
                <div className="size-8 rounded-full bg-white/5 animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-4">
                  <Link
                    href="/dashboard"
                    className="rounded-xl bg-accent text-white px-6 py-2.5 text-xs font-black hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-accent/20 uppercase tracking-widest"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={logout}
                    className="text-gray-500 cursor-pointer hover:text-red-500 transition-colors bg-white/5 p-2.5 rounded-xl border border-white/5 hover:border-red-500/20"
                    title="Logout"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Link
                    href="/login"
                    className="left-right-animated-button active:scale-95"
                  >
                    Login
                  </Link>
                </div>
              )}
            </div>
          </nav>
          <div className="lg:hidden flex items-center justify-end gap-5">
            {loading ? (
              <div className="size-8 rounded-full bg-white/5 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="rounded-xl bg-accent text-white px-4 sm:px-6 py-2.5 text-xs font-black hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-accent/20 uppercase tracking-widest"
                >
                  Dashboard
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  href="/login"
                  className="left-right-animated-button active:scale-95"
                >
                  Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <div
        ref={mobileOverlayRef}
        className="fixed inset-0 bg-background/80 backdrop-blur-md z-40 hidden opacity-0"
        onClick={() => setIsOpen(false)}
      />

      <div
        ref={mobileMenuRef}
        className={`
    fixed top-0 left-0 h-full w-[280px] bg-background/95 backdrop-blur-xl 
    border-r border-white/10 z-50 flex-col p-6 shadow-2xl
    ${isOpen ? "flex" : "hidden"}
    transform transition-all duration-300 ease-out
  `}
      >
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <span className="text-xl font-bold tracking-tighter bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent">
            {webData.websiteName}
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 p-2 hover:bg-white/10 rounded-xl transition-all duration-200 hover:text-white hover:scale-110"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col gap-6">
            {homeLinks.map((link) => (
              <Link
                key={link.name}
                href={link.url}
                onClick={() => setIsOpen(false)}
                className="group relative text-base font-medium tracking-wide text-gray-300 
                     hover:text-white transition-all duration-200 uppercase
                     flex items-center gap-2"
              >
                <span
                  className="absolute left-0 w-0 h-px bg-linear-to-r from-[#6366F1] to-transparent 
                         group-hover:w-full transition-all duration-300 -bottom-1"
                ></span>
                {link.name}
              </Link>
            ))}

          </div>
          {!loading && (
            <div className="pt-2 absolute bottom-5">
              <div className="h-[1.5px] w-[280px] bg-linear-to-r from-white/10 to-transparent mb-5" />
              {user ? (
                <div className="flex flex-col gap-4">
                  <Link
                    href="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="group relative inline-flex items-center gap-2 text-sm font-semibold 
                           tracking-wider uppercase text-[#6366F1] hover:text-[#818CF8] 
                           transition-all duration-200"
                  >
                    <span
                      className="absolute left-0 w-0 h-px bg-[#6366F1] group-hover:w-full 
                               transition-all duration-300 -bottom-1"
                    ></span>
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setIsOpen(false);
                    }}
                    className="group cursor-pointer relative inline-flex items-center gap-2 text-sm font-semibold 
                           tracking-wider uppercase text-red-500 hover:text-red-400 
                           transition-all duration-200 text-left"
                  >
                    <span
                      className="absolute left-0 w-0 h-px bg-red-500 group-hover:w-full 
                               transition-all duration-300 -bottom-1"
                    ></span>
                    Logout
                  </button>
                </div>
              ) : (
                <div className="pt-2">
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex items-center justify-center px-6 py-3 
                           bg-linear-to-r from-[#6366F1] to-[#4F46E5]
                           hover:from-[#4F46E5] hover:to-[#6366F1]
                           text-white text-sm font-bold tracking-wider uppercase 
                           rounded-xl transition-all duration-300 transform 
                           hover:scale-105 active:scale-95 shadow-lg 
                           hover:shadow-[#6366F1]/25 w-[80%]"
                  >
                    Login
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
