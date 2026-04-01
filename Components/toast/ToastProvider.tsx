"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type ToastType = "success" | "error" | "warning" | "info" | "loading";
export type ToastPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";

export interface ToastConfig {
  id?: string;
  title?: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  position?: ToastPosition;
}

interface ToastContextType {
  toasts: ToastConfig[];
  addToast: (toast: ToastConfig) => string;
  removeToast: (id: string) => void;
  toast: {
    success: (msg: string, config?: Partial<ToastConfig>) => string;
    error: (msg: string, config?: Partial<ToastConfig>) => string;
    warning: (msg: string, config?: Partial<ToastConfig>) => string;
    info: (msg: string, config?: Partial<ToastConfig>) => string;
    loading: (msg: string, config?: Partial<ToastConfig>) => string;
    custom: (config: ToastConfig) => string;
    dismiss: (id: string) => void;
    promise: <T>(
      promise: Promise<T>,
      msgs: { loading: string; success: string; error: string | ((err: any) => string) },
      config?: Partial<ToastConfig>
    ) => Promise<T>;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((config: ToastConfig) => {
    const id = config.id || Math.random().toString(36).substring(2, 9);
    const newToast = { ...config, id, position: config.position || "top-right" };
    
    setToasts((prev) => {
      if (prev.length >= 5) {
        return [...prev.slice(1), newToast];
      }
      return [...prev, newToast];
    });

    if (config.type !== "loading" && config.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, config.duration || 5000);
    }

    return id;
  }, [removeToast]);

  const toastMethods = {
    success: (title: string, config?: Partial<ToastConfig>) => 
      addToast({ title, type: "success", description: "", ...config }),
    error: (title: string, config?: Partial<ToastConfig>) => 
      addToast({ title, type: "error", description: "", ...config }),
    warning: (title: string, config?: Partial<ToastConfig>) => 
      addToast({ title, type: "warning", description: "", ...config }),
    info: (title: string, config?: Partial<ToastConfig>) => 
      addToast({ title, type: "info", description: "", ...config }),
    loading: (title: string, config?: Partial<ToastConfig>) => 
      addToast({ title, type: "loading", description: "", duration: 0, ...config }),
    custom: (config: ToastConfig) => addToast(config),
    dismiss: (id: string) => removeToast(id),
    promise: async <T,>(
      promise: Promise<T>,
      msgs: { loading: string; success: string; error: string | ((err: any) => string) },
      config?: Partial<ToastConfig>
    ): Promise<T> => {
      const id = addToast({ title: msgs.loading, type: "loading", duration: 0, ...config });
      try {
        const result = await promise;
        removeToast(id);
        addToast({ title: msgs.success, type: "success", description: "", ...config });
        return result;
      } catch (err) {
        removeToast(id);
        const errorMsg = typeof msgs.error === "function" ? msgs.error(err) : msgs.error;
        addToast({ title: errorMsg || "Something went wrong", type: "error", description: "", ...config });
        throw err;
      }
    }
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast: toastMethods }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
