"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  LogOut,
  Globe,
  Loader2,
  X,
  Menu,
  LayoutDashboard,
  Users,
  Package,
  Briefcase,
  FolderOpen,
  MessageSquare,
  Settings,
  ShieldCheck,
  Inbox,
  UserCog,
  UserSearch,
  UserCheck,
  UserRoundX,
  Compass,
  LayoutTemplate,
  ReceiptText,
  FileText,
  Braces,
  CreditCard,
} from "lucide-react";
import {
  userDashboardLinks,
  adminDashboardLinks,
  ownerDashboardLinks,
} from "../../constants/navigation";
import { useAuth } from "../../context/AuthContext";
import { gsap } from "gsap";
import { webData } from "@/constants/webData";

const iconMap = {
  LayoutDashboard: <LayoutDashboard size={18} />,
  Users: <Users size={18} />,
  Package: <Package size={18} />,
  Briefcase: <Briefcase size={18} />,
  FolderOpen: <FolderOpen size={18} />,
  MessageSquare: <MessageSquare size={18} />,
  Settings: <Settings size={18} />,
  ShieldCheck: <ShieldCheck size={18} />,
  Inbox: <Inbox size={18} />,
  UserCog: <UserCog size={18} />,
  UserSearch: <UserSearch size={18} />,
  UserCheck: <UserCheck size={18} />,
  UserRoundX: <UserRoundX size={18} />,
  Compass: <Compass size={18} />,
  LayoutTemplate: <LayoutTemplate size={18} />,
  ReceiptText: <ReceiptText size={18} />,
  FileText: <FileText size={18} />,
  Braces: <Braces size={18} />,
  CreditCard: <CreditCard size={18} />,
};

interface SidebarLink {
  name: string;
  url: string | null;
  icon: string;
  dropdown: { name: string; url: string; icon?: string }[] | null;
  ownerOnly?: boolean;
}

export default function Sidebar({
  isOpen,
  setIsOpen,
  isMobile,
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  isMobile: boolean;
}) {
  const pathname = usePathname() || "";
  const { user, logout } = useAuth();
  const router = useRouter();
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>(
    {},
  );
  const [sidebarLinks, setSidebarLinks] = useState<SidebarLink[]>([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const sidebarRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  // Clicking anywhere else closes the account menu
  useEffect(() => {
    if (!accountOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [accountOpen]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout?.();
    } finally {
      setAccountOpen(false);
      setLoggingOut(false);
      router.push("/login");
      router.refresh();
    }
  };

  useEffect(() => {
    if (user?.role === "user") {
      setSidebarLinks(userDashboardLinks);
    } else if (user?.role === "admin") {
      setSidebarLinks(adminDashboardLinks);
    } else {
      setSidebarLinks(ownerDashboardLinks);
    }
  }, [user]);

  useEffect(() => {
    if (isMobile && isOpen) {
      setIsOpen(false);
    }
  }, [pathname, isMobile]);

  useEffect(() => {
    if (!sidebarRef.current) return;

    // Animate width or position based on state
    if (isMobile) {
      if (isOpen) {
        gsap.to(overlayRef.current, {
          opacity: 1,
          duration: 0.3,
          display: "block",
        });
        gsap.to(sidebarRef.current, {
          x: 0,
          width: 280,
          duration: 0.4,
          ease: "power3.out",
        });
      } else {
        gsap.to(overlayRef.current, {
          opacity: 0,
          duration: 0.3,
          display: "none",
        });
        gsap.to(sidebarRef.current, {
          x: -300,
          duration: 0.4,
          ease: "power3.in",
        });
      }
    } else {
      if (isOpen) {
        gsap.to(sidebarRef.current, {
          x: 0,
          width: 280,
          duration: 0.4,
          ease: "power3.out",
        });
      } else {
        gsap.to(sidebarRef.current, {
          x: 0,
          width: 80,
          duration: 0.4,
          ease: "power3.in",
        });
      }
    }
  }, [isOpen, isMobile]);

  const filteredLinks = sidebarLinks.filter((link) => {
    if (link.ownerOnly && user?.role !== "owner") return false;
    return true;
  });

  const toggleDropdown = (name: string) => {
    if (!isOpen && !isMobile) {
      setIsOpen(true);
      return;
    }
    setOpenDropdowns((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <>
      <div
        ref={overlayRef}
        onClick={() => setIsOpen(false)}
        className="fixed inset-0 bg-[#0A0A0A]/80 z-40 backdrop-blur-sm hidden opacity-0"
      />

      <aside
        ref={sidebarRef}
        data-lenis-prevent
        className="fixed inset-y-0 left-0 bg-card border-r border-white/5 flex flex-col z-50 overflow-hidden shadow-2xl"
        style={{
          width: isMobile ? 280 : isOpen ? 280 : 80,
          transform: isMobile ? "translateX(-300px)" : "translateX(0)",
        }}
      >
        <div className="h-16 flex items-center justify-between px-6 shrink-0 border-b border-white/5 bg-card">
          <Link href="/">
            <div
              className="text-xl font-bold tracking-tight text-white whitespace-nowrap overflow-hidden transition-opacity"
              style={{ opacity: isOpen ? 1 : 0 }}
            >
              {webData.websiteName} <span className="text-[#6366F1]">Portal</span>
            </div>
          </Link>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all active:scale-95 absolute right-4"
          >
            {isMobile || isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div
          data-lenis-prevent
          className="flex-1 min-h-0 overflow-y-auto custom-scrollbar py-6"
        >
          <nav className="flex flex-col gap-1.5 px-4">
            {filteredLinks.map((link) => {
              const isDropdownOpen = openDropdowns[link.name] || false;
              const hasActiveChild = link.dropdown?.some((i) =>
                pathname.includes(i.url as string),
              );
              const isActive = link.url === pathname || hasActiveChild;

              if (link.dropdown) {
                return (
                  <div key={link.name} className="flex flex-col gap-1.5">
                    <button
                      onClick={() => toggleDropdown(link.name)}
                      className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all w-full group
                        ${isActive ? "bg-[#6366F1]/10 text-[#6366F1] font-bold" : "text-gray-400 hover:bg-white/5 hover:text-white"}
                      `}
                    >
                      <div className="shrink-0 flex items-center justify-center w-5">
                        {iconMap[link.icon as keyof typeof iconMap]}
                      </div>
                      <div
                        className="flex items-center justify-between flex-1 overflow-hidden transition-opacity"
                        style={{ opacity: isOpen ? 1 : 0 }}
                      >
                        <span className="text-sm whitespace-nowrap tracking-tight">
                          {link.name}
                        </span>
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`}
                        />
                      </div>
                    </button>

                    {isDropdownOpen && isOpen && (
                      <div className="overflow-hidden flex flex-col gap-1 px-4 ml-7 mt-1 border-l-2 border-white/10 py-2">
                        {link.dropdown.map((sublink) => (
                          <Link
                            key={sublink.name}
                            href={sublink.url as string}
                            className={`px-3 py-2 text-xs font-medium rounded-xl transition-all whitespace-nowrap
                                ${pathname === sublink.url ? "text-[#6366F1]" : "text-gray-500 hover:text-white"}
                              `}
                          >
                            {sublink.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={link.name}
                  href={link.url as string}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all w-full
                    ${pathname === link.url ? "bg-[#6366F1]/10 text-[#6366F1] font-bold" : "text-gray-400 hover:bg-white/5 hover:text-white"}
                  `}
                >
                  <div className="shrink-0 flex items-center justify-center w-5">
                    {iconMap[link.icon as keyof typeof iconMap]}
                  </div>
                  <span
                    className="text-sm whitespace-nowrap tracking-tight transition-opacity"
                    style={{ opacity: isOpen ? 1 : 0 }}
                  >
                    {link.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div
          ref={accountRef}
          className={`mt-auto relative transition-all duration-300 ${isOpen ? "p-4 border-t border-white/5 bg-card/50" : "p-2 py-6 border-t border-transparent"}`}
        >
          {/* Account menu — opens upward so it never falls off-screen */}
          <AnimatePresence>
            {accountOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className={`absolute bottom-full mb-2 z-50 rounded-2xl border border-white/10 bg-[#0d0d14]/97 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden ${
                  isOpen ? "left-4 right-4" : "left-2 w-56"
                }`}
              >
                <div className="px-4 py-3 border-b border-white/8">
                  <p className="text-sm font-black text-white truncate">
                    {user?.displayName || user?.username || "Account"}
                  </p>
                  <p className="text-[10px] text-gray-500 font-medium truncate">
                    {user?.email}
                  </p>
                </div>

                <Link
                  href="/dashboard/setting"
                  onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Settings size={15} /> Settings
                </Link>
                <Link
                  href="/"
                  onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Globe size={15} /> View website
                </Link>

                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/8 cursor-pointer disabled:opacity-60"
                >
                  {loggingOut ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <LogOut size={15} />
                  )}
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setAccountOpen((v) => !v)}
            aria-expanded={accountOpen}
            className={`w-full cursor-pointer transition-all duration-300 ${
              isOpen
                ? "p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20"
                : "flex justify-center rounded-xl hover:bg-white/5 py-1"
            } ${accountOpen ? "border-accent/40 bg-white/10" : ""}`}
          >
            <div className="flex items-center gap-3.5 w-full">
              <div className="size-10 rounded-xl bg-[#6366F1] flex items-center justify-center text-white text-xs uppercase font-bold shrink-0 shadow-lg">
                {user?.username?.charAt(0) || "U"}
              </div>
              <div
                className="flex-1 overflow-hidden transition-opacity text-left"
                style={{ opacity: isOpen ? 1 : 0 }}
              >
                <p className="text-sm font-bold text-white truncate tracking-tight">
                  {user?.displayName || user?.username || "Commander"}
                </p>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest leading-none mt-1">
                  {user?.role || "Operator"}
                </p>
              </div>
              {isOpen && (
                <ChevronUp
                  size={15}
                  className={`shrink-0 text-gray-500 transition-transform ${accountOpen ? "" : "rotate-180"}`}
                />
              )}
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}
