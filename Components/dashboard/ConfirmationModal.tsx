"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Loader2 } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
  isLoading?: boolean;
  type?: "danger" | "warning" | "info";
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onClose,
  isLoading = false,
  type = "danger",
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const typeConfig = {
    danger: "text-rose-500 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500 bg-rose-500 outline-rose-500",
    warning: "text-amber-500 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500 bg-amber-500 outline-amber-500",
    info: "text-blue-500 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500 bg-blue-500 outline-blue-500",
  }[type];

  const btnBg = {
    danger: "bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border-rose-500/20",
    warning: "bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white border-amber-500/20",
    info: "bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white border-blue-500/20",
  }[type];

  const btnSolid = {
    danger: "bg-rose-500 hover:bg-rose-600 shadow-rose-500/30",
    warning: "bg-amber-500 hover:bg-amber-600 shadow-amber-500/30",
    info: "bg-blue-500 hover:bg-blue-600 shadow-blue-500/30",
  }[type];

  return (
    <AnimatePresence>
      <div
      onClick={onClose}
       className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 h-screen">
        <motion.div
           initial={{ opacity: 0, scale: 0.95, y: 10 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, scale: 0.95, y: 10 }}
           className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 pb-2 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-linear-to-tr ${type === 'danger' ? 'from-rose-500 to-rose-400' : type === 'warning' ? 'from-amber-500 to-amber-400' : 'from-blue-500 to-blue-400'} text-white shadow-lg`}>
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-white bg-white/5 rounded-xl transition-colors active:scale-95"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-8">
            <p className="text-gray-400 text-base leading-7">
              {message}
            </p>
          </div>
          <div className="p-6 pt-2 bg-white/2 flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 transition-all active:scale-95 disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-[1.5] py-3 ${btnSolid} text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Processing...</span>
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>

          {/* Background Glow */}
          <div className={`absolute -bottom-20 -right-20 size-40 blur-[100px] opacity-20 ${type === 'danger' ? 'bg-rose-500' : type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
