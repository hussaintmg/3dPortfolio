"use client";

import { useNotifications } from "@/context/NotificationProvider";
import { notify } from "@/lib/notify";

/**
 * Hook to access notification methods within React components.
 * Provides both the context-based notify and the global notify utility.
 */
export function useNotify() {
  const { notify: contextNotify } = useNotifications();
  
  return { 
    notify: contextNotify || notify 
  };
}

