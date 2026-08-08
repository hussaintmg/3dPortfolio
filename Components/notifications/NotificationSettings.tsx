"use client";

import { useState } from "react";
import {
  Bell,
  BellOff,
  BellRing,
  Download,
  Smartphone,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import Toggle from "@/Components/ui/Toggle";
import { Skeleton } from "@/Components/ui/Skeleton";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/cn";

/**
 * Notification preferences: turn push on for this device, install the app so
 * alerts carry our own branding, and send a real end-to-end test.
 */
export default function NotificationSettings() {
  const {
    ready,
    supported,
    permission,
    enabled,
    subscribed,
    devices,
    busy,
    installed,
    canInstall,
    enable,
    disable,
    sendTest,
    install,
  } = usePushNotifications();

  const [testing, setTesting] = useState(false);
  const blocked = permission === "denied";
  const on = enabled && permission === "granted";

  const handleToggle = async (v: boolean) => {
    if (!v) {
      await disable();
      notify.info("Notifications off", "This device won't be alerted anymore");
      return;
    }
    const res = await enable();
    if (res.ok) {
      notify.success(
        "Notifications on",
        "You'll be alerted about chats, enquiries and payments",
      );
    } else if (res.reason === "denied") {
      notify.error(
        "Blocked by the browser",
        "Allow notifications for this site in your browser settings, then reload",
      );
    } else if (res.reason === "unsupported") {
      notify.error("Not supported", "This browser can't do push notifications");
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      const res = await sendTest();
      if (res.sent) notify.success("Test sent", res.message);
      else notify.warning("Nothing sent", res.message);
    } catch (e: any) {
      notify.error("Test failed", e.response?.data?.message || e.message);
    } finally {
      setTesting(false);
    }
  };

  if (!ready)
    return (
      <section className="rounded-3xl border border-white/10 bg-card p-8 space-y-4">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </section>
    );

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-8 space-y-7">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-xs font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
            <Bell size={14} /> Notifications
          </h2>
          <p className="text-sm text-gray-400 font-medium leading-relaxed max-w-lg">
            Get alerted the moment a chat message, enquiry or payment lands —
            even when this tab is closed.
          </p>
        </div>
        <Toggle
          checked={on}
          onChange={handleToggle}
          disabled={!supported || blocked || busy}
          aria-label="Notifications"
        />
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label: "Permission",
            value:
              permission === "granted"
                ? "Allowed"
                : permission === "denied"
                  ? "Blocked"
                  : "Not asked",
            ok: permission === "granted",
          },
          {
            label: "This device",
            value: subscribed ? "Registered" : "Not registered",
            ok: subscribed,
          },
          {
            label: "Devices",
            value: `${devices} registered`,
            ok: devices > 0,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3"
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">
              {s.label}
            </p>
            <p
              className={cn(
                "text-xs font-black mt-1",
                s.ok ? "text-emerald-400" : "text-gray-400",
              )}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {!supported && (
        <p className="text-xs font-bold text-amber-400 flex items-center gap-2">
          <BellOff size={13} /> This browser doesn't support push notifications.
        </p>
      )}

      {blocked && (
        <p className="text-xs font-bold text-amber-400 flex items-center gap-2">
          <BellOff size={13} /> Notifications are blocked for this site — enable
          them in your browser's site settings, then reload.
        </p>
      )}

      {/* Install the app so alerts drop the browser branding */}
      <div
        className={cn(
          "rounded-2xl border p-5 space-y-3",
          installed
            ? "border-emerald-500/25 bg-emerald-500/5"
            : "border-accent/25 bg-accent/5",
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "size-9 rounded-xl flex items-center justify-center shrink-0",
              installed
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-accent/15 text-accent",
            )}
          >
            {installed ? <CheckCircle2 size={17} /> : <Smartphone size={17} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white tracking-tight">
              {installed ? "Installed as an app" : "Install for branded alerts"}
            </p>
            <p className="text-[11px] text-gray-400 font-medium mt-1 leading-relaxed">
              {installed
                ? "Notifications now show your own name and logo instead of the browser's."
                : "A browser always stamps its own name on web notifications. Install this as an app and the system shows your logo and site name instead."}
            </p>
          </div>
        </div>

        {!installed && canInstall && (
          <button
            onClick={async () => {
              const accepted = await install();
              if (accepted) notify.success("Installed", "Reopen from your apps to get branded alerts");
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            <Download size={13} /> Install app
          </button>
        )}

        {!installed && !canInstall && (
          <p className="text-[10px] font-bold text-gray-500 leading-relaxed">
            Not seeing an install button? Use your browser menu → "Install app"
            (Chrome/Edge) or Share → "Add to Home Screen" (iOS).
          </p>
        )}
      </div>

      {on && (
        <button
          onClick={handleTest}
          disabled={testing}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {testing ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <BellRing size={13} />
          )}
          Send a real test
        </button>
      )}

      <p className="text-[10px] text-gray-600 font-medium flex items-center gap-1.5">
        <Sparkles size={11} /> Alerts are delivered by your device, so they
        arrive even when the site isn't open.
      </p>
    </section>
  );
}
