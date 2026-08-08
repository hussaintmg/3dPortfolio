"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ReceiptText,
  MessageSquare,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSite } from "@/context/SiteContext";
import { cn } from "@/lib/cn";

const links = [
  { name: "Overview", href: "/portal", icon: LayoutDashboard },
  { name: "My Packages", href: "/portal/packages", icon: Package },
  { name: "Invoices", href: "/portal/invoices", icon: ReceiptText },
  { name: "Chat", href: "/portal/chat", icon: MessageSquare },
  { name: "Security", href: "/portal/settings", icon: ShieldCheck },
];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { user, logout } = useAuth();
  const { settings } = useSite();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout?.();
    } finally {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-60 p-2.5 bg-card border border-white/10 rounded-xl shadow-lg text-gray-400 hover:text-accent transition-colors"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-60 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-70 w-[270px] bg-card border-r border-white/8 flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <Link href="/portal" className="min-w-0">
            <p className="text-lg font-black text-white tracking-tighter truncate">
              {settings.websiteName}
            </p>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent">
              Client Portal
            </p>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {links.map((l) => {
            const Icon = l.icon;
            const active =
              l.href === "/portal"
                ? pathname === "/portal"
                : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                  active
                    ? "bg-accent text-white shadow-lg shadow-accent/20"
                    : "text-gray-400 hover:text-white hover:bg-white/5",
                )}
              >
                <Icon size={18} />
                {l.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/3">
            <div className="size-9 rounded-xl bg-linear-to-tr from-accent to-purple-500 flex items-center justify-center text-white font-black text-sm uppercase shrink-0">
              {(user?.displayName || user?.username || "?").slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate">
                {user?.displayName || user?.username}
              </p>
              <p className="text-[10px] text-gray-500 font-medium truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeft size={15} /> Back to website
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-bold text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-[270px] min-w-0">{children}</main>
    </div>
  );
}
