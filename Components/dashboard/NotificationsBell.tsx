"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Inbox,
  Mail,
  MessageSquare,
  CreditCard,
  Sparkles,
  CheckCheck,
  Loader2,
  GripVertical,
} from "lucide-react";

const POS_KEY = "bell-position";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/Components/ui/Skeleton";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface Notif {
  _id: string;
  type: "enquiry" | "subscriber" | "chat" | "payment" | "system";
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
}

const typeIcon: Record<Notif["type"], React.ReactNode> = {
  enquiry: <Inbox size={15} />,
  subscriber: <Mail size={15} />,
  chat: <MessageSquare size={15} />,
  payment: <CreditCard size={15} />,
  system: <Sparkles size={15} />,
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Bell + dropdown; polls every 30s. Rendered only for admin/owner. */
export default function NotificationsBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  /** Anchored from the top-right so it stays put when the window is resized. */
  const [pos, setPos] = useState({ top: 16, right: 24 });
  const dragRef = useRef<
    { x: number; y: number; top: number; right: number } | null
  >(null);

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      top: pos.top,
      right: pos.right,
    };
  };

  const onDragMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setPos({
      top: Math.max(4, Math.min(window.innerHeight - 60, d.top + (e.clientY - d.y))),
      // Right-anchored, so a rightward drag DECREASES the offset
      right: Math.max(4, Math.min(window.innerWidth - 60, d.right - (e.clientX - d.x))),
    });
  };

  const endDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(pos));
    } catch {
      /* storage disabled — position just won't persist */
    }
  };
  const { notifyLocal } = usePushNotifications();
  /** Ids already announced, so a poll never re-alerts the same item. */
  const announced = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  const isStaff = user?.role === "admin" || user?.role === "owner";

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get("/api/notifications");
      if (res.data.success) {
        const list: Notif[] = res.data.notifications || [];

        // Raise a desktop alert for anything unread we haven't shown before.
        // The first poll only seeds the set — otherwise every reload would
        // replay the whole backlog.
        if (firstLoad.current) {
          list.forEach((n) => announced.current.add(n._id));
          firstLoad.current = false;
        } else {
          list
            .filter((n) => !n.read && !announced.current.has(n._id))
            .forEach((n) => {
              announced.current.add(n._id);
              notifyLocal(n.title, {
                body: n.body,
                tag: n._id,
                url: n.link || "/dashboard",
              });
            });
        }

        setItems(list);
        setUnread(res.data.unread || 0);
      }
    } catch {
      // silent — bell just stays as-is
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isStaff) return;
    fetchNotifications();
    const t = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(t);
  }, [isStaff, fetchNotifications]);

  // Where the owner last parked the bell
  useEffect(() => {
    try {
      const saved = localStorage.getItem(POS_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        if (typeof p?.top === "number" && typeof p?.right === "number") {
          setPos(p);
        }
      }
    } catch {
      // corrupt entry — the default corner is fine
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (open && wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const markAllRead = async () => {
    try {
      setMarking(true);
      await axios.put("/api/notifications", {});
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {
    } finally {
      setMarking(false);
    }
  };

  const openItem = async (n: Notif) => {
    if (!n.read) {
      axios.put("/api/notifications", { ids: [n._id] }).catch(() => {});
      setItems((prev) =>
        prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)),
      );
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  if (!isStaff) return null;

  return (
    <div
      ref={wrapRef}
      className="fixed z-70"
      style={{ top: pos.top, right: pos.right }}
    >
      {/* Drag handle — the bell overlapped page headers on some screens and
          there was no way to shift it out of the way. */}
      <button
        onPointerDown={startDrag}
        onPointerMove={onDragMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        title="Drag to move"
        aria-label="Move notifications button"
        className="absolute -left-5 top-1/2 -translate-y-1/2 p-1 rounded text-gray-700 hover:text-accent opacity-0 hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical size={13} />
      </button>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative size-11 rounded-xl bg-card border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-accent/40 transition-all shadow-lg active:scale-95"
      >
        <Bell size={18} />
        {unread > 0 && (
          <>
            <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-accent text-white text-[9px] font-black flex items-center justify-center border-2 border-background">
              {unread > 99 ? "99+" : unread}
            </span>
            <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 rounded-full bg-accent animate-ping opacity-30" />
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 mt-3 w-[380px] max-w-[calc(100vw-3rem)] rounded-3xl bg-[#0d0d14]/95 backdrop-blur-2xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h3 className="text-xs font-black text-white uppercase tracking-widest">
                Notifications
              </h3>
              <button
                onClick={markAllRead}
                disabled={marking || unread === 0}
                className="flex items-center gap-1.5 text-[10px] font-black text-accent uppercase tracking-widest hover:text-white transition-colors disabled:opacity-40"
              >
                {marking ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <CheckCheck size={12} />
                )}
                Mark all read
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <Skeleton className="size-9 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="py-14 text-center space-y-3">
                  <Bell size={28} className="mx-auto text-gray-700" />
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    All caught up
                  </p>
                </div>
              ) : (
                items.map((n) => (
                  <button
                    key={n._id}
                    onClick={() => openItem(n)}
                    className={`w-full text-left px-5 py-4 flex items-start gap-3.5 border-b border-white/3 transition-colors hover:bg-white/5 ${
                      n.read ? "opacity-60" : ""
                    }`}
                  >
                    <div
                      className={`size-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        n.read
                          ? "bg-white/5 text-gray-500 border-white/5"
                          : "bg-accent/15 text-accent border-accent/20"
                      }`}
                    >
                      {typeIcon[n.type] || typeIcon.system}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-white leading-snug truncate">
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-gray-500 font-medium truncate mt-0.5">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-1.5">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="size-2 rounded-full bg-accent shrink-0 mt-2" />
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
