"use client";

import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { useNotifications } from "@/context/NotificationProvider";
import { ToastPosition } from "./ToastProvider";
import { ToastItem } from "./ToastItem";

const positions: Record<ToastPosition, string> = {
  "top-right": "top-12 right-4 md:right-12",
  "top-left": "top-12 left-4 md:left-12",
  "bottom-right": "bottom-12 right-4 md:right-12",
  "bottom-left": "bottom-12 left-4 md:left-12",
  "top-center": "top-12 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] md:w-auto",
  "bottom-center": "bottom-12 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] md:w-auto"
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useNotifications();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  const groupedToasts = toasts.reduce<Record<ToastPosition, typeof toasts>>((acc, toast) => {
    const pos = toast.position || "top-right";
    if (!acc[pos]) acc[pos] = [];
    acc[pos].push(toast);
    return acc;
  }, {} as any);

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-99999 overflow-hidden">
      {(Object.keys(groupedToasts) as ToastPosition[]).map((pos) => (
        <div key={pos} className={`absolute flex flex-col gap-3 z-99999 ${positions[pos]} ${pos.includes('center') ? 'items-center' : pos.includes('right') ? 'items-end' : 'items-start'} max-md:left-1/2! max-md:-translate-x-1/2! max-md:right-auto! max-md:w-full max-md:px-4 max-md:items-center`}>
          <AnimatePresence mode="popLayout">
            {groupedToasts[pos].map((toast) => (
              <ToastItem key={toast.id} {...toast} />
            ))}
          </AnimatePresence>
        </div>
      ))}
    </div>,
    document.body
  );
};

