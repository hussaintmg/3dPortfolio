"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  Mail,
  MessageSquare,
  CreditCard,
  Sparkles,
  X,
  ArrowRight,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import { useSite } from "@/context/SiteContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { cn } from "@/lib/cn";

interface LiveItem {
  _id: string;
  type: "enquiry" | "subscriber" | "chat" | "payment" | "system";
  title: string;
  body: string;
  link: string;
  createdAt: string;
}

const STYLES: Record<
  LiveItem["type"],
  { icon: React.ReactNode; ring: string; tint: string }
> = {
  enquiry: {
    icon: <Inbox size={16} />,
    ring: "border-indigo-500/30",
    tint: "bg-indigo-500/15 text-indigo-300",
  },
  subscriber: {
    icon: <Mail size={16} />,
    ring: "border-cyan-500/30",
    tint: "bg-cyan-500/15 text-cyan-300",
  },
  chat: {
    icon: <MessageSquare size={16} />,
    ring: "border-emerald-500/30",
    tint: "bg-emerald-500/15 text-emerald-300",
  },
  payment: {
    icon: <CreditCard size={16} />,
    ring: "border-amber-500/30",
    tint: "bg-amber-500/15 text-amber-300",
  },
  system: {
    icon: <Sparkles size={16} />,
    ring: "border-white/15",
    tint: "bg-white/10 text-gray-300",
  },
};

const LIFETIME = 9000;

/**
 * Realtime notification cards.
 *
 * Listens on the socket so anything raised server-side lands instantly in
 * every open tab. If the tab is in the background, the service worker raises
 * a system notification instead (with our own icon).
 */
export default function LiveNotifications() {
  const { user } = useAuth();
  const { settings } = useSite();
  const { notifyLocal } = usePushNotifications();
  const router = useRouter();
  const [items, setItems] = useState<LiveItem[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i._id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback(
    (item: LiveItem) => {
      setItems((prev) => {
        if (prev.some((p) => p._id === item._id)) return prev;
        // Keep the stack short so it never covers the page
        return [item, ...prev].slice(0, 4);
      });
      timers.current[item._id] = setTimeout(() => dismiss(item._id), LIFETIME);

      // Background tab → let the OS show it, with our branding
      notifyLocal(item.title, {
        body: item.body,
        url: item.link,
        tag: `${item.type}-${item._id}`,
      });
    },
    [dismiss, notifyLocal],
  );

  useEffect(() => {
    if (!user) return;
    const isStaff = user.role === "admin" || user.role === "owner";

    let cancelled = false;

    (async () => {
      // Boots the socket server on first use
      await fetch("/api/socket").catch(() => {});
      if (cancelled) return;

      const socket = io({ path: "/api/socket" });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join_room", isStaff ? "staff" : String(user.id));
      });

      socket.on("notification:new", (payload: LiveItem) => {
        if (!payload?.title) return;
        push(payload);
      });
    })();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    };
  }, [user, push]);

  if (!user || items.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-[97] flex flex-col gap-3 w-[min(360px,calc(100vw-2rem))] pointer-events-none">
      <AnimatePresence initial={false}>
        {items.map((item) => {
          const s = STYLES[item.type] || STYLES.system;
          return (
            <motion.div
              key={item._id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className={cn(
                "pointer-events-auto rounded-2xl border bg-[#0d0d14]/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.55)] overflow-hidden",
                s.ring,
              )}
            >
              <div className="flex items-start gap-3 p-4">
                <div
                  className={cn(
                    "size-9 rounded-xl flex items-center justify-center shrink-0",
                    s.tint,
                  )}
                >
                  {s.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">
                    {settings.websiteName}
                  </p>
                  <p className="text-sm font-black text-white leading-snug mt-0.5">
                    {item.title}
                  </p>
                  {item.body && (
                    <p className="text-xs text-gray-400 font-medium mt-1 line-clamp-2 leading-relaxed">
                      {item.body}
                    </p>
                  )}

                  {item.link && (
                    <button
                      onClick={() => {
                        router.push(item.link);
                        dismiss(item._id);
                      }}
                      className="mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-accent hover:text-white transition-colors"
                    >
                      Open <ArrowRight size={11} />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => dismiss(item._id)}
                  className="p-1 rounded-lg text-gray-600 hover:text-white transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Time-to-live bar */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: LIFETIME / 1000, ease: "linear" }}
                style={{ transformOrigin: "left" }}
                className="h-0.5 bg-accent/60"
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
