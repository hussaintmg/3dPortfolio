"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
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
} from "lucide-react";
import {
  userDashboardLinks,
  adminDashboardLinks,
  ownerDashboardLinks,
} from "../../constants/navigation";
import { useAuth } from "../../context/AuthContext";
import { gsap } from "gsap";

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
  const { user } = useAuth();
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>(
    {},
  );
  const [sidebarLinks, setSidebarLinks] = useState<SidebarLink[]>([]);

  const sidebarRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

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
              Genesis <span className="text-[#6366F1]">Portal</span>
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
          className={`mt-auto transition-all duration-300 ${isOpen ? "p-4 border-t border-white/5 bg-card/50" : "p-2 py-6 border-t border-transparent relative"}`}
        >
          <div
            className={`transition-all duration-300 ${isOpen ? "p-4 rounded-xl bg-white/5 border border-white/10" : "flex justify-center"}`}
          >
            <div className="flex items-center gap-3.5 w-full">
              <div className="size-10 rounded-xl bg-[#6366F1] flex items-center justify-center text-white text-xs uppercase font-bold shrink-0 shadow-lg">
                {user?.username?.charAt(0) || "U"}
              </div>
              <div
                className="flex-1 overflow-hidden transition-opacity"
                style={{ opacity: isOpen ? 1 : 0 }}
              >
                <p className="text-sm font-bold text-white truncate tracking-tight">
                  {user?.displayName || user?.username || "Commander"}
                </p>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest leading-none mt-1">
                  {user?.role || "Operator"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
