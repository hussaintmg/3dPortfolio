"use client";

import { ShieldCheck } from "lucide-react";
import PasskeyManager from "@/Components/auth/PasskeyManager";
import NotificationSettings from "@/Components/notifications/NotificationSettings";
import EditableText from "@/Components/editable/EditableText";

export default function PortalSettings() {
  return (
    <div className="p-6 sm:p-10 space-y-8 pt-20 lg:pt-10 max-w-3xl">
      <header className="space-y-2">
        <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
          <ShieldCheck className="text-accent" size={26} />
          <EditableText k="portal.settings.heading">Security &amp; Alerts</EditableText>
        </h1>
        <EditableText
          k="portal.settings.subheading"
          as="p"
          className="text-sm text-gray-400 font-medium block"
        >
          Set up fingerprint or face sign-in and choose how you hear from me.
        </EditableText>
      </header>

      <PasskeyManager />
      <NotificationSettings />
    </div>
  );
}
