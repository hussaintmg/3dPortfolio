"use client";

import { ToastConfig } from "@/Components/toast/ToastProvider";

export type NotifyType = "success" | "error" | "info" | "warning";

export interface NotifyMethods {
  success: (msg: string, configOrDesc?: Partial<ToastConfig> | string) => string;
  error: (msg: string, configOrDesc?: Partial<ToastConfig> | string) => string;
  info: (msg: string, configOrDesc?: Partial<ToastConfig> | string) => string;
  warning: (msg: string, configOrDesc?: Partial<ToastConfig> | string) => string;
  loading: (msg: string, configOrDesc?: Partial<ToastConfig> | string) => string;
  dismiss: (id: string) => void;
  promise: <T>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: string | ((err: any) => string) },
    config?: Partial<ToastConfig>
  ) => Promise<T>;
}

let notifyRef: NotifyMethods | null = null;

/**
 * Internal function to set the notification reference from the provider
 */
export const setNotifyRef = (ref: NotifyMethods) => {
  notifyRef = ref;
};

/**
 * Global notification utility that can be used anywhere in the application
 * (both inside and outside React components)
 */
export const notify: NotifyMethods = {
  success: (msg, configOrDesc) => {
    const config = typeof configOrDesc === "string" ? { description: configOrDesc } : configOrDesc;
    return notifyRef?.success(msg, config) || "";
  },
  error: (msg, configOrDesc) => {
    const config = typeof configOrDesc === "string" ? { description: configOrDesc } : configOrDesc;
    return notifyRef?.error(msg, config) || "";
  },
  info: (msg, configOrDesc) => {
    const config = typeof configOrDesc === "string" ? { description: configOrDesc } : configOrDesc;
    return notifyRef?.info(msg, config) || "";
  },
  warning: (msg, configOrDesc) => {
    const config = typeof configOrDesc === "string" ? { description: configOrDesc } : configOrDesc;
    return notifyRef?.warning(msg, config) || "";
  },
  loading: (msg, configOrDesc) => {
    const config = typeof configOrDesc === "string" ? { description: configOrDesc } : configOrDesc;
    return notifyRef?.loading(msg, config) || "";
  },
  dismiss: (id) => {
    notifyRef?.dismiss(id);
  },
  promise: (promise, msgs, config) => {
    if (notifyRef) {
      return notifyRef.promise(promise, msgs, config);
    }
    // Fallback if notify system isn't initialized yet
    return promise;
  },
};

