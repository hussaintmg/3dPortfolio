"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  CheckCircle2, AlertCircle, Info, Loader2, X, AlertTriangle 
} from "lucide-react";
import { ToastConfig } from "./ToastProvider";
import { useNotifications } from "@/context/NotificationProvider";

const icons = {
  success: {
    icon: <CheckCircle2 className="size-4 text-emerald-400" />,
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    progress: "bg-emerald-400"
  },
  error: {
    icon: <AlertCircle className="size-4 text-rose-400" />,
    bg: "bg-rose-400/10",
    border: "border-rose-400/20",
    progress: "bg-rose-400"
  },
  warning: {
    icon: <AlertTriangle className="size-4 text-amber-400" />,
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    progress: "bg-amber-400"
  },
  info: {
    icon: <Info className="size-4 text-sky-400" />,
    bg: "bg-sky-400/10",
    border: "border-sky-400/20",
    progress: "bg-sky-400"
  },
  loading: {
    icon: <Loader2 className="size-4 text-indigo-400 animate-spin" />,
    bg: "bg-indigo-400/10",
    border: "border-indigo-400/20",
    progress: "bg-indigo-400"
  }
};

export const ToastItem: React.FC<ToastConfig> = ({
  id,
  title,
  description,
  type = "info",
  duration = 5000,
  position = "top-right"
}) => {
  const { removeNotification } = useNotifications();
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (type === "loading" || duration === 0 || isPaused) return;

    const startTime = Date.now();
    const intervalId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      
      setProgress(remaining);
      
      if (remaining <= 0) {
        clearInterval(intervalId);
        removeNotification(id!);
      }
    }, 16);

    return () => clearInterval(intervalId);
  }, [duration, id, removeNotification, type, isPaused]);

  const config = icons[type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: position.includes("top") ? -10 : 10, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px) brightness(1)" }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      whileHover={{ scale: 1.02, filter: "blur(0px) brightness(1.1)" }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="group pointer-events-auto relative min-w-[280px] max-w-sm md:max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 p-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-colors hover:bg-zinc-900/90"
    >
      {/* Inner highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="flex items-start gap-4">
        {/* Icon Circle */}
        <div className={`shrink-0 rounded-full p-2 border ${config.bg} ${config.border} shadow-sm`}>
           {config.icon}
        </div>

        {/* Text Content */}
        <div className="flex-1 space-y-1.5 pt-0.5">
          {title ? (
             <h4 className="text-[13px] font-black uppercase tracking-wider text-white leading-tight">{title}</h4>
          ) : (
             <h4 className="text-[13px] font-black uppercase tracking-wider text-white leading-tight">{type}</h4>
          )}
          {description && (
             <p className="text-[13px] font-medium text-zinc-400 leading-relaxed font-sans">{description}</p>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={() => removeNotification(id!)}
          className="shrink-0 -mr-1 rounded-lg p-1 text-white/20 transition-all hover:bg-white/5 hover:text-white active:scale-90"
        >
          <X size={16} />
        </button>
      </div>

      {/* Animated Progress Bar */}
      {duration > 0 && type !== "loading" && (
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-white/5">
          <motion.div
            className={`h-full ${config.progress} shadow-[0_0_10px_rgba(0,0,0,0.2)]`}
            style={{ width: `${progress}%`, transition: isPaused ? "none" : "width 50ms linear" }}
          />
        </div>
      )}
    </motion.div>
  );
};
