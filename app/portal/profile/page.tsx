"use client";

import { UserRound } from "lucide-react";
import ProfileEditor from "@/Components/profile/ProfileEditor";
import EditableText from "@/Components/editable/EditableText";

export default function PortalProfilePage() {
  return (
    <div className="p-4 sm:p-6 md:p-10 pt-20 lg:pt-10 space-y-8 max-w-3xl">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tighter flex items-center gap-3">
          <UserRound className="text-accent" size={26} />
          <EditableText k="portal.profile.heading">My Profile</EditableText>
        </h1>
        <EditableText
          k="portal.profile.subheading"
          as="p"
          className="text-sm text-gray-400 font-medium block"
        >
          Keep your details up to date so invoices and messages reach the right
          place.
        </EditableText>
      </header>

      <ProfileEditor />
    </div>
  );
}
