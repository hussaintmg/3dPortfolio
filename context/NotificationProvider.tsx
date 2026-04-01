"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from "react";
import { setNotifyRef, NotifyMethods } from "@/lib/notify";
import { ToastConfig } from "@/Components/toast/ToastProvider";

interface NotificationContextType {
  toasts: ToastConfig[];
  addNotification: (config: ToastConfig) => string;
  removeNotification: (id: string) => void;
  notify: NotifyMethods;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * NotificationProvider - Global handler for notifications across the app.
 * Manages both toast state and global notify utility synchronization.
 */
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);
  // Tracking last notifications to prevent spamming
  const lastToasts = useRef<Record<string, number>>({}); 

  const removeNotification = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addNotification = useCallback((config: ToastConfig) => {
    const messageKey = `${config.type}:${config.title}:${config.description || ""}`;
    const now = Date.now();
    
    // Duplicate Spam Prevention (2s debounce for same message/type combo)
    if (lastToasts.current[messageKey] && now - lastToasts.current[messageKey] < 2000) {
      return "";
    }
    lastToasts.current[messageKey] = now;

    const id = config.id || Math.random().toString(36).substring(2, 9);
    const newToast = { ...config, id, position: config.position || "top-right" };
    
    setToasts((prev) => {
      // Basic queue management: Maintain only last 5
      if (prev.length >= 5) {
        return [...prev.slice(1), newToast];
      }
      return [...prev, newToast];
    });

    if (config.type !== "loading" && config.duration !== 0) {
      setTimeout(() => {
        removeNotification(id);
      }, config.duration || 5000);
    }

    // Future Extensibility Point:
    // Here you could trigger push notifications, save to a DB store, etc.
    // persistNotification(config);

    return id;
  }, [removeNotification]);

  const notifyMethods: NotifyMethods = {
    success: (title, config) => addNotification({ title, type: "success",  ...config }),
    error: (title, config) => addNotification({ title, type: "error", ...config }),
    warning: (title, config) => addNotification({ title, type: "warning", ...config }),
    info: (title, config) => addNotification({ title, type: "info", ...config }),
    loading: (title, config) => addNotification({ title, type: "loading", duration: 0, ...config }),
    dismiss: (id) => removeNotification(id),
    promise: async (promise, msgs, config) => {
      const id = addNotification({ title: msgs.loading, type: "loading", duration: 0, ...config });
      try {
        const result = await promise;
        removeNotification(id);
        addNotification({ title: msgs.success, type: "success", ...config });
        return result;
      } catch (err) {
        removeNotification(id);
        const errorMsg = typeof msgs.error === "function" ? msgs.error(err) : msgs.error;
        addNotification({ title: errorMsg || "Something went wrong", type: "error", ...config });
        throw err;
      }
    }
  };

  // Sync with global notify singleton on mount
  useEffect(() => {
    setNotifyRef(notifyMethods);
  }, []);

  return (
    <NotificationContext.Provider value={{ toasts, addNotification, removeNotification, notify: notifyMethods }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
